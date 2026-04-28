/**
 * gap-020 / SOP V26.2: Cost tracker middleware for Hono routes
 *
 * Usage:
 *   app.use('/api/chat/*', costTrackerMiddleware('maestro'));
 *   app.post('/api/voice/chat/:id', costTrackerMiddleware('voice'), handler);
 *
 * Enforces budget cap before processing. If over budget → 429 + Telegram alert.
 */

import type { Context, Next } from 'hono';
import { canDispatch, alertIfOverBudget } from '../services/budget-enforcer.js';

export function costTrackerMiddleware(agent_id: string) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const check = canDispatch(agent_id);

    if (!check.allowed) {
      // Fire-and-forget Telegram alert
      alertIfOverBudget(100).catch(() => {});

      return c.json(
        {
          error: 'Budget cap exceeded',
          agent_id,
          reason:       check.reason,
          daily_used:   check.status.daily_used,
          daily_cap:    check.status.daily_cap,
          daily_pct:    check.status.daily_pct,
          monthly_used: check.status.monthly_used,
          monthly_cap:  check.status.monthly_cap,
        },
        429,
      );
    }

    await next();
  };
}
