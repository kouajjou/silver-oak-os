/**
 * Budget Enforcement service for Silver Oak OS Maestro
 * gap-002: Enforce budget caps via budget-tracker.ts (gap-020)
 * Block dispatch if agent over budget, send Telegram alert
 */
import { checkBudgetStatus } from './budget-tracker.js';
export interface BudgetCheckResult {
    allowed: boolean;
    reason?: string;
    status: ReturnType<typeof checkBudgetStatus>;
}
export declare class BudgetEnforcementError extends Error {
    agent_id: string;
    status: ReturnType<typeof checkBudgetStatus>;
    constructor(message: string, agent_id: string, status: ReturnType<typeof checkBudgetStatus>);
}
/**
 * Check if agent can proceed with planned cost.
 * Returns { allowed: false } if budget would be exceeded.
 */
export declare function canDispatch(agent_id: string, planned_cost_usd?: number): BudgetCheckResult;
/**
 * Enforce budget: throws BudgetEnforcementError if not allowed.
 * Use as guard before dispatch.
 */
export declare function enforceBudget(agent_id: string, planned_cost_usd?: number): void;
/**
 * Get budget status summary for all agents (for Telegram report).
 */
export declare function getBudgetSummary(): string;
/**
 * Send Telegram alert if any agent over budget threshold.
 */
export declare function alertIfOverBudget(threshold_pct?: number): Promise<void>;
//# sourceMappingURL=budget-enforcer.d.ts.map