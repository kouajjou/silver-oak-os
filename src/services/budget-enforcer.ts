/**
 * Budget Enforcement service for Silver Oak OS Maestro
 * gap-002: Enforce budget caps via budget-tracker.ts (gap-020)
 * Block dispatch if agent over budget, send Telegram alert
 */

import { trackCost, checkBudgetStatus, setAgentBudget, getAllAgentsCosts } from './budget-tracker.js';

export interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  status: ReturnType<typeof checkBudgetStatus>;
}

export class BudgetEnforcementError extends Error {
  constructor(
    message: string,
    public agent_id: string,
    public status: ReturnType<typeof checkBudgetStatus>
  ) {
    super(message);
    this.name = 'BudgetEnforcementError';
  }
}

/**
 * Check if agent can proceed with planned cost.
 * Returns { allowed: false } if budget would be exceeded.
 */
export function canDispatch(agent_id: string, planned_cost_usd: number = 0): BudgetCheckResult {
  const status = checkBudgetStatus(agent_id);

  if (status.over_budget) {
    return {
      allowed: false,
      reason: `Agent ${agent_id} over budget: daily $${status.daily_used.toFixed(2)}/$${status.daily_cap} (${status.daily_pct.toFixed(0)}%)`,
      status
    };
  }

  const projected_daily = status.daily_used + planned_cost_usd;
  if (projected_daily >= status.daily_cap) {
    return {
      allowed: false,
      reason: `Planned dispatch would exceed daily cap: $${projected_daily.toFixed(2)}/$${status.daily_cap}`,
      status
    };
  }

  return { allowed: true, status };
}

/**
 * Enforce budget: throws BudgetEnforcementError if not allowed.
 * Use as guard before dispatch.
 */
export function enforceBudget(agent_id: string, planned_cost_usd: number = 0): void {
  const check = canDispatch(agent_id, planned_cost_usd);
  if (!check.allowed) {
    throw new BudgetEnforcementError(check.reason ?? 'Budget exceeded', agent_id, check.status);
  }
}

/**
 * Get budget status summary for all agents (for Telegram report).
 */
export function getBudgetSummary(): string {
  const all = getAllAgentsCosts();

  if (all.length === 0) return 'No agent costs tracked yet.';

  const lines = all.map(a => {
    const status = checkBudgetStatus(a.agent_id);
    const flag = status.over_budget ? '🔴' : status.daily_pct > 80 ? '🟡' : '✅';
    return `${flag} ${a.agent_id}: $${a.daily.toFixed(2)}/$${status.daily_cap} (${status.daily_pct.toFixed(0)}%)`;
  });

  return lines.join('\n');
}

/**
 * Send Telegram alert if any agent over budget threshold.
 */
export async function alertIfOverBudget(threshold_pct: number = 80): Promise<void> {
  const all = getAllAgentsCosts();
  const overThreshold = all.filter(a => {
    const status = checkBudgetStatus(a.agent_id);
    return status.daily_pct >= threshold_pct;
  });

  if (overThreshold.length === 0) return;

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.ALLOWED_CHAT_ID ?? '5566541774';

  if (!BOT_TOKEN) return;

  const message = `⚠️ Budget Alert (>${threshold_pct}%):\n${getBudgetSummary()}`;

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text: message })
  }).catch(() => {});
}
