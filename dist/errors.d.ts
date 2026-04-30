/**
 * Structured error taxonomy for ClaudeClaw agent failures.
 *
 * Classifies errors from the Claude Code SDK into actionable categories
 * with recovery hints, so the user gets helpful messages instead of
 * "Something went wrong."
 */
export type ErrorCategory = 'auth' | 'rate_limit' | 'context_exhausted' | 'timeout' | 'subprocess_crash' | 'network' | 'billing' | 'overloaded' | 'unknown';
export interface ErrorRecovery {
    shouldRetry: boolean;
    shouldNewChat: boolean;
    shouldSwitchModel: boolean;
    retryAfterMs: number;
    userMessage: string;
}
export declare class AgentError extends Error {
    category: ErrorCategory;
    recovery: ErrorRecovery;
    originalError: Error | undefined;
    constructor(category: ErrorCategory, recovery: ErrorRecovery, originalError?: Error);
}
/**
 * Classify a raw error from the Claude Code SDK into a structured AgentError.
 * Parses the error message and any stderr output for known patterns.
 * If the error is already an AgentError, returns it unchanged.
 */
export declare function classifyError(err: unknown, contextTokens?: number): AgentError;
//# sourceMappingURL=errors.d.ts.map