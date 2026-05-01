export interface CostEntry {
    agent_id: string;
    cost_usd: number;
    tokens_in?: number;
    tokens_out?: number;
    model?: string;
}
export interface BudgetStatus {
    daily_used: number;
    daily_cap: number;
    daily_pct: number;
    monthly_used: number;
    monthly_cap: number;
    monthly_pct: number;
    over_budget: boolean;
}
/**
 * Record an LLM cost event for an agent.
 *
 * PhD fix 2026-05-01: Validates agent_id before insert. Invalid IDs
 * (test artefacts, blocked patterns) are logged but NOT recorded.
 * Set BUDGET_TRACKER_STRICT=true to throw instead of silent skip.
 */
export declare function trackCost(entry: CostEntry): void;
/**
 * Get total cost for an agent in the last 24 hours.
 */
export declare function getAgentDailyTotal(agent_id: string): number;
/**
 * Get total cost for an agent in the last 30 days.
 */
export declare function getAgentMonthlyTotal(agent_id: string): number;
/**
 * Set daily and monthly budget caps for an agent.
 * Defaults: daily=3.0 USD, monthly=50.0 USD.
 */
export declare function setAgentBudget(agent_id: string, daily_cap_usd: number, monthly_cap_usd: number): void;
/**
 * Check current budget status for an agent.
 * Returns usage percentages and whether the agent is over budget.
 */
export declare function checkBudgetStatus(agent_id: string): BudgetStatus;
/**
 * Get all agents' daily and monthly cost totals.
 */
export declare function getAllAgentsCosts(): Array<{
    agent_id: string;
    daily: number;
    monthly: number;
}>;
//# sourceMappingURL=budget-tracker.d.ts.map