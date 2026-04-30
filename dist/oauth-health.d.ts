type Sender = (text: string) => Promise<void>;
/**
 * Start periodic OAuth health checks.
 * Monitors ~/.claude/.credentials.json for token expiration.
 * Alerts via the provided sender callback when expiration is near.
 *
 * Configure via env vars:
 * - OAUTH_CHECK_MINUTES: check interval (default 30)
 * - OAUTH_ALERT_HOURS: alert threshold before expiry (default 2)
 *
 * Automatically skips when CLAUDE_CODE_OAUTH_TOKEN is set.
 */
export declare function initOAuthHealthCheck(sender: Sender): void;
export {};
//# sourceMappingURL=oauth-health.d.ts.map