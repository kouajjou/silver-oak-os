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
export declare function costTrackerMiddleware(agent_id: string): (c: Context, next: Next) => Promise<Response | void>;
//# sourceMappingURL=cost-tracker-middleware.d.ts.map