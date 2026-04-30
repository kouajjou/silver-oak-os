/**
 * gap-020 / SOP V26.2: Budget status data for /api/budget/status dashboard endpoint
 * Returns live spending data from budget-tracker SQLite (gap-020)
 */
import { getAllAgentsCosts, checkBudgetStatus } from '../services/budget-tracker.js';
/**
 * Get budget status for one agent or all agents.
 * @param agent_id - specific agent ID, or 'all' / undefined for everyone
 */
export function getBudgetStatusData(agent_id) {
    if (agent_id && agent_id !== 'all') {
        return [formatAgent(agent_id)];
    }
    const all = getAllAgentsCosts();
    if (all.length === 0)
        return [];
    return all.map(a => formatAgent(a.agent_id));
}
function formatAgent(agent_id) {
    const s = checkBudgetStatus(agent_id);
    return {
        agent_id,
        daily_used: s.daily_used,
        daily_cap: s.daily_cap,
        daily_pct: s.daily_pct,
        monthly_used: s.monthly_used,
        monthly_cap: s.monthly_cap,
        monthly_pct: s.monthly_pct,
        over_budget: s.over_budget,
        status_flag: s.over_budget ? 'critical' : s.daily_pct >= 80 ? 'warning' : 'ok',
    };
}
//# sourceMappingURL=budget-status.js.map