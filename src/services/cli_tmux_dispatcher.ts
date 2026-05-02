/**
 * cli_tmux_dispatcher.ts — Mode 1 : dispatch vers tmux sessions via MCP Bridge
 *
 * Remplace les appels API Anthropic (coûteux) par des dispatches vers des sessions
 * tmux qui tournent sur le forfait Pro Max Claude ($0 marginal, ~$200/mois flat).
 *
 * Architecture :
 *   Factory → POST /dispatch (MCP Bridge) → tmux session 'opus' (Pro Max Claude)
 *   Factory ← poll read_session_output (MCP StreamableHTTP) ← TASK_DONE détecté
 *
 * Économie estimée : $50-200/mois vs API Anthropic classique
 * SOP V26 R79 : pas de merge auto — branche feature/ uniquement
 */

import axios from 'axios';
import { randomUUID } from 'crypto';
import { logger } from '../logger.js';
import { readEnvFile } from '../env.js';

// PhD fix 2026-04-30: silver-oak-os reads .env via readEnvFile (not dotenv).
// process.env['MCP_BRIDGE_URL'] was undefined -> fallback to old Claudette URL (502).
// New: read .env first, then process.env fallback, then Factory local default.
const _envMcp = readEnvFile(['MCP_BRIDGE_URL']);
const MCP_BRIDGE_URL = _envMcp['MCP_BRIDGE_URL']
  ?? process.env['MCP_BRIDGE_URL']
  ?? 'http://127.0.0.1:3004';  // Factory local default (was https://mcp.silveroak.one - DOWN)

// Sessions supportées (voir SESSION_NAMES dans session-manager.ts)
export type TmuxSession =
  | 'opus'
  | 'claude-code'
  | 'claude-backend'
  | 'claude-frontend'
  | 'claude-browser';

export interface TmuxDispatchResult {
  content: string;
  cost_usd: 0;
  model: string;
  source: 'pro_max_forfait';
  latency_ms: number;
}

// ── MCP StreamableHTTP helpers ────────────────────────────────────────────────

/**
 * Initialize an MCP StreamableHTTP session.
 * Returns the mcp-session-id required for subsequent tool calls.
 */
async function mcpInit(): Promise<string> {
  const resp = await axios.post(
    `${MCP_BRIDGE_URL}/mcp`,
    {
      jsonrpc: '2.0',
      method: 'initialize',
      id: 1,
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'factory-client', version: '1.0' },
      },
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      responseType: 'text',
      timeout: 15000,
    }
  );

  const sessionId = resp.headers['mcp-session-id'] as string | undefined;
  if (!sessionId) {
    throw new Error('MCP init failed: no mcp-session-id in response');
  }
  return sessionId;
}

/**
 * Parse MCP SSE response body and extract the text content of the first tool result.
 */
function parseMcpToolResult(rawData: string): string {
  for (const line of rawData.split('\n')) {
    if (line.startsWith('data: ')) {
      try {
        const parsed = JSON.parse(line.slice(6));
        const text: unknown =
          (parsed as { result?: { content?: Array<{ text?: string }> } })
            ?.result?.content?.[0]?.text;
        if (typeof text === 'string') return text;
      } catch {
        // skip malformed lines
      }
    }
  }
  throw new Error(`Cannot parse MCP SSE response: ${rawData.slice(0, 200)}`);
}

/**
 * Call a single MCP tool via StreamableHTTP transport.
 */
async function mcpCallTool(
  mcpSessionId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  const resp = await axios.post(
    `${MCP_BRIDGE_URL}/mcp`,
    {
      jsonrpc: '2.0',
      method: 'tools/call',
      id: Date.now(),
      params: { name: toolName, arguments: args },
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'mcp-session-id': mcpSessionId,
      },
      responseType: 'text',
      timeout: 15000,
    }
  );

  return parseMcpToolResult(resp.data as string);
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

/**
 * Dispatch a prompt to a tmux session via MCP Bridge and poll for completion.
 *
 * Uses POST /dispatch to send the prompt, then polls read_session_output
 * every pollIntervalMs until TASK_DONE is detected or timeout is reached.
 *
 * @param session  Target tmux session (default: 'opus' for Pro Max)
 * @param prompt   The task prompt to send
 * @param options  timeoutMs (default 600 000 = 10 min), pollIntervalMs (default 60 000)
 */
export async function dispatchToTmuxSession(
  session: TmuxSession,
  prompt: string,
  options?: { timeoutMs?: number; pollIntervalMs?: number }
): Promise<TmuxDispatchResult> {
  const start = Date.now();
  const timeout = options?.timeoutMs ?? 600_000;   // 10 min
  const pollInterval = options?.pollIntervalMs ?? 60_000; // 60s

  // PhD fix 2026-04-30: unique dispatch ID prevents stale TASK_DONE match
  const dispatchId = `dispatch-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const taskDoneMarker = `TASK_DONE_${dispatchId}`;

  // Inject the unique marker into the prompt — Claude must end with it
  const promptWithMarker = `${prompt}

──────────────────────────────────────────────
⚠️ FIN DE TÂCHE OBLIGATOIRE — Quand tu as TERMINÉ:
\`\`\`bash
echo "${taskDoneMarker}"
\`\`\`
Cette commande exacte est OBLIGATOIRE comme DERNIÈRE ligne.
──────────────────────────────────────────────`;

  logger.info(
    { session, promptLen: prompt.length, timeout, pollInterval, dispatchId },
    'cli_tmux_dispatcher.send'
  );

  // 1. Send prompt via /dispatch REST endpoint
  await axios.post(
    `${MCP_BRIDGE_URL}/dispatch`,
    { session, prompt: promptWithMarker, priority: 'high' },
    { timeout: 30_000 }
  );

  // 2. Initialize MCP session for polling
  const mcpSessionId = await mcpInit();
  logger.debug({ mcpSessionId, session }, 'cli_tmux_dispatcher.mcp_session_init');

  // 3. Poll until TASK_DONE or timeout
  while (Date.now() - start < timeout) {
    await new Promise<void>((r) => setTimeout(r, pollInterval));

    let output: string;
    try {
      output = await mcpCallTool(mcpSessionId, 'read_session_output', {
        session,
        lines: 50,
      });
    } catch (err) {
      logger.warn({ session, err }, 'cli_tmux_dispatcher.poll_error');
      continue; // retry on transient errors
    }

    logger.debug(
      { session, elapsed: Date.now() - start, hasTaskDone: output.includes('TASK_DONE') },
      'cli_tmux_dispatcher.poll'
    );

    if (output.includes(taskDoneMarker)) {
      const model =
        session === 'opus' ? 'claude-opus-4.7-tmux' : (session === 'claude-browser' ? 'claude-sonnet-4.6-browser' : 'claude-sonnet-4.6-tmux');
      logger.info(
        { session, model, latency: Date.now() - start, dispatchId },
        'cli_tmux_dispatcher.task_done'
      );

      // Extract output AFTER our dispatch marker injection (skip stale buffer)
      // Strategy: cut output at the FIRST occurrence of our injected prompt marker
      // and return everything after. If not found, return full output as-is.
      const promptMarkerStart = output.lastIndexOf('FIN DE TÂCHE OBLIGATOIRE');
      const cleanedOutput = promptMarkerStart > 0
        ? output.slice(promptMarkerStart)
        : output;

      return {
        content: cleanedOutput,
        cost_usd: 0,
        model,
        source: 'pro_max_forfait',
        latency_ms: Date.now() - start,
      };
    }
  }

  throw new Error(
    `cli_tmux_dispatcher: timeout after ${timeout}ms on session '${session}'`
  );
}
