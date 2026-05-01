export interface MaestroDispatchLogEntry {
    user_id: string;
    mode: string;
    task: string;
    provider?: string | null;
    model?: string | null;
    success: boolean;
    cost_usd?: number;
    latency_ms?: number;
    error?: string | null;
}
/**
 * Insert un dispatch log. NON-bloquant : swallow errors silently.
 * Toujours appeler en fire-and-forget.
 */
export declare function logMaestroDispatch(entry: MaestroDispatchLogEntry): void;
/**
 * Cleanup auto : rows > 30 jours.
 * Appele au boot par index.ts.
 */
export declare function cleanupOldDispatches(): number;
/**
 * Stats pour dashboard : count par mode/provider sur les N derniers jours.
 */
export declare function getDispatchStats(daysBack?: number): {
    total: number;
    success: number;
    fail: number;
    total_cost_usd: number;
    by_mode: Array<{
        mode: string;
        count: number;
        cost: number;
    }>;
    by_provider: Array<{
        provider: string | null;
        count: number;
        cost: number;
        fail_rate_pct: number;
    }>;
};
/**
 * Recent dispatches list (pour debug/dashboard). Limit max 100.
 */
export declare function getRecentDispatches(limit?: number): Array<{
    id: number;
    ts: number;
    user_id: string;
    mode: string;
    task_preview: string;
    provider: string | null;
    model: string | null;
    success: number;
    cost_usd: number;
    latency_ms: number;
    error_msg: string | null;
}>;
//# sourceMappingURL=maestro-dispatch-log.d.ts.map