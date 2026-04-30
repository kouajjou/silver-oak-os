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
export type TmuxSession = 'opus' | 'claude-code' | 'claude-backend' | 'claude-frontend';
export interface TmuxDispatchResult {
    content: string;
    cost_usd: 0;
    model: string;
    source: 'pro_max_forfait';
    latency_ms: number;
}
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
export declare function dispatchToTmuxSession(session: TmuxSession, prompt: string, options?: {
    timeoutMs?: number;
    pollIntervalMs?: number;
}): Promise<TmuxDispatchResult>;
//# sourceMappingURL=cli_tmux_dispatcher.d.ts.map