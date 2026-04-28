/**
 * cli_dispatcher.ts — Mode 1 CLI tmux dispatch (Pro Max forfait $0)
 *
 * Smarter wrapper around MCP Bridge dispatch:
 * - 5s default poll interval (vs 60s in cli_tmux_dispatcher)
 * - Auto session routing based on task content
 * - TASK_DONE_CLI_DISPATCH marker for reliable completion detection
 * - cost_usd always 0 (Pro Max forfait flat)
 *
 * Uses real MCP Bridge endpoints:
 *   POST /dispatch              → send prompt to tmux session
 *   POST /mcp (StreamableHTTP)  → poll read_session_output tool
 *
 * Activated by: USE_PRO_MAX_CLI=true in .env
 * Fallback:     maestro_dispatcher.ts Mode 2 (Anthropic API)
 */

import axios from 'axios';
import { logger } from '../logger.js';

const MCP_BRIDGE_URL = process.env['MCP_BRIDGE_URL'] ?? 'https://mcp.silveroak.one';

export type CliSession = 'claude-code' | 'claude-backend' | 'claude-frontend' | 'opus';

export interface CliDispatchOptions {
  session: CliSession;
  prompt: string;
  timeoutMs?: number;       // default 300 000 (5 min)
  pollIntervalMs?: number;  // default 5 000 (5s — fast poll for task completion)
}

export interface CliDispatchResult {
  success: boolean;
  output: string;
  session: CliSession;
  duration_ms: number;
  cost_usd: 0;             // always 0 — Pro Max forfait flat
  task_done: boolean;
}

/**
 * Auto-select the best tmux session for a given task description.
 * - Complex architecture/refactor → 'opus' (Opus Pro Max, deep reasoning)
 * - Frontend/React/UI → 'claude-frontend'
 * - Backend/API/server → 'claude-backend'
 * - Default code/debug → 'claude-code'
 */
export function selectSession(taskDescription: string): CliSession {
  const lower = taskDescription.toLowerCase();

  const isComplex =
    /architect|refactor|redesign|strateg|autonomous|orchestrat|vision|migration|big.bang|strangler/i.test(lower);
  if (isComplex) return 'opus';

  const isFrontend =
    /frontend|react|next\.?js|\bui\b|component|tailwind|css|\bpage\b|layout|design.system/i.test(lower);
  if (isFrontend) return 'claude-frontend';

  const isBackend =
    /backend|api|route|endpoint|express|hono|middleware|postgres|supabase|redis|bullmq|worker|stripe|payment|billing|webhook/i.test(lower);
  if (isBackend) return 'claude-backend';

  return 'claude-code';
}

// ── MCP StreamableHTTP helpers (mirrors cli_tmux_dispatcher) ─────────────────

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
        clientInfo: { name: 'cli-dispatcher', version: '1.0' },
      },
    },
    {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      responseType: 'text',
      timeout: 15_000,
    }
  );
  const sessionId = resp.headers['mcp-session-id'] as string | undefined;
  if (!sessionId) throw new Error('MCP init failed: no mcp-session-id');
  return sessionId;
}

function parseMcpToolResult(rawData: string): string {
  for (const line of rawData.split('\n')) {
    if (line.startsWith('data: ')) {
      try {
        const parsed = JSON.parse(line.slice(6));
        const text: unknown =
          (parsed as { result?: { content?: Array<{ text?: string }> } })
            ?.result?.content?.[0]?.text;
        if (typeof text === 'string') return text;
      } catch { /* skip */ }
    }
  }
  throw new Error(`Cannot parse MCP SSE: ${rawData.slice(0, 200)}`);
}

async function mcpCallTool(mcpSessionId: string, toolName: string, args: Record<string, unknown>): Promise<string> {
  const resp = await axios.post(
    `${MCP_BRIDGE_URL}/mcp`,
    { jsonrpc: '2.0', method: 'tools/call', id: Date.now(), params: { name: toolName, arguments: args } },
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'mcp-session-id': mcpSessionId,
      },
      responseType: 'text',
      timeout: 15_000,
    }
  );
  return parseMcpToolResult(resp.data as string);
}

// ── Main dispatch function ────────────────────────────────────────────────────

/**
 * Dispatch a prompt to a CLI tmux session via MCP Bridge.
 * Polls every pollIntervalMs (default 5s) for TASK_DONE_CLI_DISPATCH marker.
 *
 * @param opts  session, prompt, timeoutMs, pollIntervalMs
 * @returns     CliDispatchResult with output and cost_usd: 0
 */
export async function dispatchToCLI(opts: CliDispatchOptions): Promise<CliDispatchResult> {
  const start = Date.now();
  const timeout = opts.timeoutMs ?? 300_000;
  const pollMs = opts.pollIntervalMs ?? 5_000;

  // Append TASK_DONE marker instruction (Claude will include it when complete)
  const fullPrompt = `${opts.prompt}

When you have finished your response, output exactly this on its own line:
TASK_DONE_CLI_DISPATCH`;

  logger.info(
    { session: opts.session, promptLen: fullPrompt.length, timeout, pollMs },
    'cli_dispatcher.send'
  );

  // 1. Send prompt to session via /dispatch
  await axios.post(
    `${MCP_BRIDGE_URL}/dispatch`,
    { session: opts.session, prompt: fullPrompt, priority: 'high' },
    { timeout: 30_000 }
  );

  // 2. Initialize MCP session for polling
  const mcpSessionId = await mcpInit();

  // 3. Poll every pollMs for TASK_DONE_CLI_DISPATCH marker
  let output = '';
  let taskDone = false;

  while (Date.now() - start < timeout) {
    await new Promise<void>((r) => setTimeout(r, pollMs));

    try {
      output = await mcpCallTool(mcpSessionId, 'read_session_output', {
        session: opts.session,
        lines: 80,
      });
    } catch (err) {
      logger.warn({ session: opts.session, err }, 'cli_dispatcher.poll_error');
      continue;
    }

    const hasMarker =
      output.includes('TASK_DONE_CLI_DISPATCH') ||
      /TASK_DONE_[A-Z_]+/i.test(output);

    logger.debug(
      { session: opts.session, elapsed: Date.now() - start, hasMarker },
      'cli_dispatcher.poll'
    );

    if (hasMarker) {
      taskDone = true;
      // Strip marker line from output
      output = output
        .split('\n')
        .filter((l) => !l.includes('TASK_DONE_CLI_DISPATCH'))
        .join('\n')
        .trim();
      break;
    }
  }

  logger.info(
    { session: opts.session, taskDone, duration: Date.now() - start },
    taskDone ? 'cli_dispatcher.done' : 'cli_dispatcher.timeout'
  );

  return {
    success: taskDone,
    output,
    session: opts.session,
    duration_ms: Date.now() - start,
    cost_usd: 0,
    task_done: taskDone,
  };
}
