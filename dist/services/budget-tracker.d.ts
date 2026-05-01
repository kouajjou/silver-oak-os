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
/**
 * PhD fix 2026-05-01 - Phase 4.2: Cleanup automatique des artefacts dev.
 *
 * Supprime de la table agent_costs les rows dont l'agent_id matche les
 * BLOCKED_AGENT_PATTERNS (ex: task_breaker_test-*, maestro_factory-*, etc.)
 * Ces rows polluent les stats budget car elles sont generees par les tests
 * dev mais comptees comme depenses reelles.
 *
 * Doit etre appelee periodiquement (cron quotidien) depuis index.ts.
 * Retourne le nombre de rows supprimees.
 */
export declare function cleanupBudgetArtefacts(): {
    deleted: number;
    samples: string[];
};
export declare function startBudgetCleanupCron(): void;
export declare function stopBudgetCleanupCron(): void;
//# sourceMappingURL=budget-tracker.d.ts.map