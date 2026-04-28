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
 *
 * PATCH 2026-04-29 — feat(autocompact): kill+restart session before each dispatch
 * Reason: sessions accumulate context → auto-compact mid-task → lost work.
 * Fix: restartSessionBeforeDispatch() ensures clean slate before every dispatch.
 */

import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../logger.js';

const execAsync = promisify(exec);

const MCP_BRIDGE_URL = process.env['MCP_BRIDGE_URL'] ?? 'https://mcp.silveroak.one';

// Sessions supportées (voir SESSION_NAMES dans session-manager.ts)
export type TmuxSession =
  | 'opus'
  | 'claude-code'
  | 'claude-backend'
  | 'claude-frontend';

export interface TmuxDispatchResult {
  content: string;
  cost_usd: 0;
  model: string;
  source: 'pro_max_forfait';
  latency_ms: number;
}

// ── Auto-compact : restart tmux session before dispatch ───────────────────────

/**
 * Kill and recreate a tmux session to clear accumulated context (auto-compact bug).
 * Graceful: if claude CLI is absent, falls back to plain bash session.
 * If restart fails entirely, logs a warning and continues (non-fatal).
 *
 * Session start commands:
 *   opus            → ANTHROPIC_MODEL=claude-opus-4-7 claude --dangerously-skip-permissions
 *   claude-code/backend/frontend → claude --dangerously-skip-permissions
 *   fallback (no claude CLI) → bash
 */
async function restartSessionBeforeDispatch(session: TmuxSession): Promise<void> {
  // 1. Kill existing session (ignore error if session didn't exist)
  try {
    await execAsync(`tmux kill-session -t ${session} 2>/dev/null || true`);
  } catch {
    // Session didn't exist — that's fine, continue to create
  }

  // 2. Determine claude CLI start command per session
  const claudeCmd =
    session === 'opus'
      ? `ANTHROPIC_MODEL=claude-opus-4-7 claude --dangerously-skip-permissions`
      : `claude --dangerously-skip-permissions`;

  const workdir = '/app/silver-oak-os';

  // 3. Try to create session with claude CLI
  try {
    await execAsync(
      `tmux new-session -d -s ${session} 'cd ${workdir} && ${claudeCmd}; bash'`
    );
    logger.info({ session }, '🔄 Auto-compact: session restarted with claude CLI');
  } catch {
    // claude CLI not installed — fall back to bash session (will receive tmux send-keys)
    try {
      await execAsync(
        `tmux new-session -d -s ${session} 'cd ${workdir} && bash'`
      );
      logger.warn(
        { session },
        '🔄 Auto-compact: claude CLI absent, created bash session (MCP will send-keys)'
      );
    } catch (err) {
      // Session restart completely failed — non-fatal, log and continue
      logger.warn(
        { session, err },
        '⚠️ Auto-compact: session restart failed — dispatching to existing session anyway'
      );
      return;
    }
  }

  // 4. Wait 2 seconds for session to initialize before sending prompt
  await new Promise<void>((r) => setTimeout(r, 2000));
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
 * PATCH 2026-04-29: Kills and restarts the target tmux session before sending
 * the prompt, to prevent context saturation (auto-compact mid-task bug).
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

  // ── Auto-compact: restart session before dispatch to clear context ──────────
  await restartSessionBeforeDispatch(session);
  // ───────────────────────────────────────────────────────────────────────────

  logger.info(
    { session, promptLen: prompt.length, timeout, pollInterval },
    'cli_tmux_dispatcher.send'
  );

  // 1. Send prompt via /dispatch REST endpoint
  await axios.post(
    `${MCP_BRIDGE_URL}/dispatch`,
    { session, prompt, priority: 'high' },
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

    if (output.includes('TASK_DONE') || /TASK_DONE_[a-z0-9-]+/i.test(output)) {
      const model =
        session === 'opus' ? 'claude-opus-4.7-tmux' : 'claude-sonnet-4.6-tmux';
      logger.info(
        { session, model, latency: Date.now() - start },
        'cli_tmux_dispatcher.task_done'
      );

      return {
        content: output,
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
