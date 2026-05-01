/**
 * Maestro Dispatch Log — PhD fix 2026-05-01 - Phase 4.3
 *
 * SQLite persistant log de chaque dispatch Maestro pour :
 *   - debug post-mortem (quel provider a fail, combien de retries)
 *   - cost analysis (cout par user, par mode, par provider)
 *   - audit security (qui a dispatche quoi)
 *   - dashboard /api/maestro/dispatches (frontend)
 *
 * Log NON-bloquant : l'echec d'insert ne doit JAMAIS planter le dispatch.
 * Cleanup auto : rows >30 jours purgees au boot.
 *
 * Schema :
 *   id, ts, user_id, mode, task_preview, provider, model,
 *   success, cost_usd, latency_ms, error_msg
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from '../logger.js';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'maestro-dispatch.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS maestro_dispatches (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    ts           INTEGER DEFAULT (unixepoch()),
    user_id      TEXT    NOT NULL,
    mode         TEXT    NOT NULL,
    task_preview TEXT    NOT NULL,
    provider     TEXT,
    model        TEXT,
    success      INTEGER NOT NULL DEFAULT 0,
    cost_usd     REAL    DEFAULT 0,
    latency_ms   INTEGER DEFAULT 0,
    error_msg    TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_md_ts       ON maestro_dispatches(ts);
  CREATE INDEX IF NOT EXISTS idx_md_user     ON maestro_dispatches(user_id);
  CREATE INDEX IF NOT EXISTS idx_md_provider ON maestro_dispatches(provider);
  CREATE INDEX IF NOT EXISTS idx_md_success  ON maestro_dispatches(success);
`);

const stmtInsert = db.prepare(`
  INSERT INTO maestro_dispatches
    (user_id, mode, task_preview, provider, model, success, cost_usd, latency_ms, error_msg)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const stmtCleanup = db.prepare(`
  DELETE FROM maestro_dispatches WHERE ts < unixepoch() - 30 * 86400
`);

export interface MaestroDispatchLogEntry {
  user_id: string;
  mode: string; // 'mode_1_tmux' | 'mode_2_api'
  task: string; // truncated to 200 chars
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
export function logMaestroDispatch(entry: MaestroDispatchLogEntry): void {
  try {
    stmtInsert.run(
      entry.user_id,
      entry.mode,
      entry.task.slice(0, 200),
      entry.provider ?? null,
      entry.model ?? null,
      entry.success ? 1 : 0,
      entry.cost_usd ?? 0,
      entry.latency_ms ?? 0,
      entry.error ?? null
    );
  } catch (err) {
    // NEVER throw — logging must not break dispatch flow
    logger.warn({ err }, '[maestro-log] insert failed');
  }
}

/**
 * Cleanup auto : rows > 30 jours.
 * Appele au boot par index.ts.
 */
export function cleanupOldDispatches(): number {
  try {
    const info = stmtCleanup.run();
    return info.changes;
  } catch (err) {
    logger.warn({ err }, '[maestro-log] cleanup failed');
    return 0;
  }
}

/**
 * Stats pour dashboard : count par mode/provider sur les N derniers jours.
 */
export function getDispatchStats(daysBack = 7): {
  total: number;
  success: number;
  fail: number;
  total_cost_usd: number;
  by_mode: Array<{ mode: string; count: number; cost: number }>;
  by_provider: Array<{ provider: string | null; count: number; cost: number; fail_rate_pct: number }>;
} {
  const cutoff = Math.floor(Date.now() / 1000) - daysBack * 86400;

  const totals = db
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(success) AS success,
              SUM(1 - success) AS fail,
              SUM(cost_usd) AS total_cost
       FROM maestro_dispatches WHERE ts >= ?`
    )
    .get(cutoff) as { total: number; success: number; fail: number; total_cost: number };

  const byMode = db
    .prepare(
      `SELECT mode, COUNT(*) AS count, SUM(cost_usd) AS cost
       FROM maestro_dispatches WHERE ts >= ? GROUP BY mode`
    )
    .all(cutoff) as Array<{ mode: string; count: number; cost: number }>;

  const byProvider = db
    .prepare(
      `SELECT provider,
              COUNT(*) AS count,
              SUM(cost_usd) AS cost,
              ROUND(100.0 * SUM(1 - success) / COUNT(*), 1) AS fail_rate_pct
       FROM maestro_dispatches WHERE ts >= ? GROUP BY provider`
    )
    .all(cutoff) as Array<{ provider: string | null; count: number; cost: number; fail_rate_pct: number }>;

  return {
    total: totals.total ?? 0,
    success: totals.success ?? 0,
    fail: totals.fail ?? 0,
    total_cost_usd: totals.total_cost ?? 0,
    by_mode: byMode,
    by_provider: byProvider,
  };
}

/**
 * Recent dispatches list (pour debug/dashboard). Limit max 100.
 */
export function getRecentDispatches(limit = 50): Array<{
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
}> {
  const max = Math.min(Math.max(limit, 1), 100);
  return db
    .prepare(
      `SELECT id, ts, user_id, mode, task_preview, provider, model,
              success, cost_usd, latency_ms, error_msg
       FROM maestro_dispatches ORDER BY ts DESC LIMIT ?`
    )
    .all(max) as Array<{
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
}
