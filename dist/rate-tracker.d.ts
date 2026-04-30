/**
 * In-memory sliding window rate tracker for API usage.
 *
 * Tracks messages per minute, tokens per hour, and cost per day
 * using simple arrays that get pruned on each status check.
 * All state resets on process restart.
 */
export interface RateStatus {
    messagesPerMinute: number;
    tokensPerHour: number;
    costToday: number;
    warnings: string[];
}
/**
 * Record a usage event (one message with associated token count and cost).
 */
export declare function trackUsage(tokens: number, cost: number): void;
/**
 * Get current rate status and generate warnings if approaching limits.
 *
 * @param dailyBudget - Maximum cost (USD) allowed per 24h window
 * @param hourlyTokenBudget - Maximum tokens allowed per 1h window
 */
export declare function getRateStatus(dailyBudget: number, hourlyTokenBudget: number): RateStatus;
/**
 * Clear all tracked state. Useful for testing.
 */
export declare function resetRateTracker(): void;
//# sourceMappingURL=rate-tracker.d.ts.map