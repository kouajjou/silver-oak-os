/**
 * gap-020 / SOP V26.2: Budget status data for /api/budget/status dashboard endpoint
 * Returns live spending data from budget-tracker SQLite (gap-020)
 */
export interface AgentBudgetSummary {
    agent_id: string;
    daily_used: number;
    daily_cap: number;
    daily_pct: number;
    monthly_used: number;
    monthly_cap: number;
    monthly_pct: number;
    over_budget: boolean;
    status_flag: 'ok' | 'warning' | 'critical';
}
/**
 * Get budget status for one agent or all agents.
 * @param agent_id - specific agent ID, or 'all' / undefined for everyone
 */
export declare function getBudgetStatusData(agent_id?: string): AgentBudgetSummary[];
//# sourceMappingURL=budget-status.d.ts.map