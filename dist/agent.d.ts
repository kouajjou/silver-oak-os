import { AgentError } from './errors.js';
export interface McpStdioConfig {
    command: string;
    args?: string[];
    env?: Record<string, string>;
}
/**
 * Merge MCP server configs from user settings (~/.claude/settings.json) and
 * project settings (.claude/settings.json in cwd), optionally filtered by
 * an allowlist (e.g. from an agent's agent.yaml `mcp_servers` field).
 *
 * Exported so the voice bridge can reuse the exact same loader the text
 * bot uses — keeping behavior consistent across channels.
 */
export declare function loadMcpServers(allowlist?: string[], projectCwd?: string): Record<string, McpStdioConfig>;
export interface UsageInfo {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens: number;
    totalCostUsd: number;
    /** True if the SDK auto-compacted context during this turn */
    didCompact: boolean;
    /** Token count before compaction (if it happened) */
    preCompactTokens: number | null;
    /**
     * The cache_read_input_tokens from the LAST API call in the turn.
     * Unlike the cumulative cacheReadInputTokens, this reflects the actual
     * context window size (cumulative overcounts on multi-step tool-use turns).
     */
    lastCallCacheRead: number;
    /**
     * The input_tokens from the LAST API call in the turn.
     * This is the actual context window size: system prompt + conversation
     * history + tool results for that call. Use this for context warnings.
     */
    lastCallInputTokens: number;
}
/** Progress event emitted during agent execution for Telegram feedback. */
export interface AgentProgressEvent {
    type: 'task_started' | 'task_completed' | 'tool_active';
    description: string;
}
export interface AgentResult {
    text: string | null;
    newSessionId: string | undefined;
    usage: UsageInfo | null;
    aborted?: boolean;
}
/**
 * Run a single user message through Claude Code and return the result.
 *
 * Uses `resume` to continue the same session across Telegram messages,
 * giving Claude persistent context without re-sending history.
 *
 * Auth: The SDK spawns the `claude` CLI subprocess which reads OAuth auth
 * from ~/.claude/ automatically (the same auth used in the terminal).
 * No explicit token needed if you're already logged in via `claude login`.
 * Optionally override with CLAUDE_CODE_OAUTH_TOKEN in .env.
 *
 * @param message    The user's text (may include transcribed voice prefix)
 * @param sessionId  Claude Code session ID to resume, or undefined for new session
 * @param onTyping   Called every TYPING_REFRESH_MS while waiting — sends typing action to Telegram
 * @param onProgress Called when sub-agents start/complete — sends status updates to Telegram
 */
export declare function runAgent(message: string, sessionId: string | undefined, onTyping: () => void, onProgress?: (event: AgentProgressEvent) => void, model?: string, abortController?: AbortController, onStreamText?: (accumulatedText: string) => void, mcpAllowlist?: string[]): Promise<AgentResult>;
/**
 * Run the agent with automatic retry for transient errors.
 * Only retries errors where recovery.shouldRetry is true.
 * Calls onRetry before each retry so the caller can notify the user.
 */
export declare function runAgentWithRetry(message: string, sessionId: string | undefined, onTyping: () => void, onProgress?: (event: AgentProgressEvent) => void, model?: string, abortController?: AbortController, onStreamText?: (accumulatedText: string) => void, onRetry?: (attempt: number, error: AgentError) => void, fallbackModels?: string[], mcpAllowlist?: string[]): Promise<AgentResult>;
//# sourceMappingURL=agent.d.ts.map