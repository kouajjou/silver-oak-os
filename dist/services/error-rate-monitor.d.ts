export interface RequestEntry {
    agent_id: string;
    status_code: number;
    route?: string;
}
export interface ErrorRateResult {
    agent_id: string;
    total: number;
    errors: number;
    error_rate_pct: number;
    window_minutes: number;
    threshold_pct: number;
    exceeded: boolean;
}
/**
 * Log a single request result.
 * An error is defined as status_code >= 500 OR status_code === 0 (timeout/crash).
 */
export declare function logRequest(entry: RequestEntry): void;
/**
 * Compute error rate for one agent over the sliding window.
 */
export declare function getErrorRate(agent_id: string, windowMinutes?: number, thresholdPct?: number): ErrorRateResult;
/**
 * Check error rate and fire a Telegram alert if threshold exceeded.
 * Uses TELEGRAM_BOT_TOKEN + ALLOWED_CHAT_ID from env.
 * No-op if env vars absent (graceful degradation).
 */
export declare function checkAndAlert(agent_id: string, windowMinutes?: number, thresholdPct?: number): Promise<ErrorRateResult>;
/**
 * Get error rates for ALL agents active in the window.
 */
export declare function getAllAgentsErrorRates(windowMinutes?: number, thresholdPct?: number): ErrorRateResult[];
/**
 * Cleanup rows older than 24h (call in cron or on startup).
 */
export declare function cleanupOldEntries(): number;
//# sourceMappingURL=error-rate-monitor.d.ts.map