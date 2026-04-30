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
export type CliSession = 'claude-code' | 'claude-backend' | 'claude-frontend' | 'opus';
export interface CliDispatchOptions {
    session: CliSession;
    prompt: string;
    timeoutMs?: number;
    pollIntervalMs?: number;
}
export interface CliDispatchResult {
    success: boolean;
    output: string;
    session: CliSession;
    duration_ms: number;
    cost_usd: 0;
    task_done: boolean;
}
/**
 * Auto-select the best tmux session for a given task description.
 * - Complex architecture/refactor → 'opus' (Opus Pro Max, deep reasoning)
 * - Frontend/React/UI → 'claude-frontend'
 * - Backend/API/server → 'claude-backend'
 * - Default code/debug → 'claude-code'
 */
export declare function selectSession(taskDescription: string): CliSession;
/**
 * Dispatch a prompt to a CLI tmux session via MCP Bridge.
 * Polls every pollIntervalMs (default 5s) for TASK_DONE_CLI_DISPATCH marker.
 *
 * @param opts  session, prompt, timeoutMs, pollIntervalMs
 * @returns     CliDispatchResult with output and cost_usd: 0
 */
export declare function dispatchToCLI(opts: CliDispatchOptions): Promise<CliDispatchResult>;
//# sourceMappingURL=cli_dispatcher.d.ts.map