/**
 * SQLite-based error rate monitor (SOP V26.1 Fix 2/3).
 *
 * Tracks HTTP request success/failure per agent over a sliding window.
 * Fires Telegram alert if error rate exceeds threshold (default 30%).
 * Database stored at: data/error-rate.db (gitignored, WAL mode)
 */
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "error-rate.db");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS request_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id    TEXT    NOT NULL,
    status_code INTEGER NOT NULL,
    is_error    INTEGER NOT NULL DEFAULT 0,
    route       TEXT,
    timestamp   INTEGER DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_req_agent ON request_log(agent_id);
  CREATE INDEX IF NOT EXISTS idx_req_ts    ON request_log(timestamp);
  CREATE INDEX IF NOT EXISTS idx_req_err   ON request_log(is_error);
`);

export interface RequestEntry {
  agent_id: string;
  status_code: number;
  route?: string;
}

export interface ErrorRateResult {
  agent_id: string;
  total: number;
  errors: number;
  error_rate_pct: number;
  window_minutes: number;
  threshold_pct: number;
  exceeded: boolean;
}

// ── Prepared statements ────────────────────────────────────────────────────
const stmtInsert = db.prepare(
  "INSERT INTO request_log (agent_id, status_code, is_error, route) VALUES (?, ?, ?, ?)"
);

const stmtStats = db.prepare(`
  SELECT
    COUNT(*)                      AS total,
    SUM(is_error)                 AS errors
  FROM request_log
  WHERE agent_id = ?
    AND timestamp >= unixepoch() - (? * 60)
`);

const stmtAllAgents = db.prepare(`
  SELECT DISTINCT agent_id FROM request_log
  WHERE timestamp >= unixepoch() - (? * 60)
`);

const stmtCleanup = db.prepare(
  "DELETE FROM request_log WHERE timestamp < unixepoch() - 86400"
);

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Log a single request result.
 * An error is defined as status_code >= 500 OR status_code === 0 (timeout/crash).
 */
export function logRequest(entry: RequestEntry): void {
  const isError = entry.status_code >= 500 || entry.status_code === 0 ? 1 : 0;
  stmtInsert.run(entry.agent_id, entry.status_code, isError, entry.route ?? null);
}

/**
 * Compute error rate for one agent over the sliding window.
 */
export function getErrorRate(
  agent_id: string,
  windowMinutes = 5,
  thresholdPct = 30
): ErrorRateResult {
  const row = stmtStats.get(agent_id, windowMinutes) as {
    total: number;
    errors: number;
  };
  const total = row.total ?? 0;
  const errors = row.errors ?? 0;
  const error_rate_pct = total > 0 ? (errors / total) * 100 : 0;
  return {
    agent_id,
    total,
    errors,
    error_rate_pct: Math.round(error_rate_pct * 10) / 10,
    window_minutes: windowMinutes,
    threshold_pct: thresholdPct,
    exceeded: total >= 5 && error_rate_pct >= thresholdPct,
  };
}

/**
 * Check error rate and fire a Telegram alert if threshold exceeded.
 * Uses TELEGRAM_BOT_TOKEN + ALLOWED_CHAT_ID from env.
 * No-op if env vars absent (graceful degradation).
 */
export async function checkAndAlert(
  agent_id: string,
  windowMinutes = 5,
  thresholdPct = 30
): Promise<ErrorRateResult> {
  const result = getErrorRate(agent_id, windowMinutes, thresholdPct);

  if (result.exceeded) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.ALLOWED_CHAT_ID;
    if (token && chatId) {
      const text =
        `🚨 *Error Rate Alert* — \`${agent_id}\`\n` +
        `Rate: *${result.error_rate_pct}%* (threshold: ${thresholdPct}%)\n` +
        `Window: ${windowMinutes} min | Errors: ${result.errors}/${result.total}\n` +
        `→ Check \`pm2 logs silver-oak-os-backend\``;

      await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: "Markdown",
          }),
        }
      ).catch(() => {
        // Non-blocking — alert failure must not crash the monitor
      });
    }
  }

  return result;
}

/**
 * Get error rates for ALL agents active in the window.
 */
export function getAllAgentsErrorRates(windowMinutes = 5, thresholdPct = 30): ErrorRateResult[] {
  const agents = stmtAllAgents.all(windowMinutes) as { agent_id: string }[];
  return agents.map((a) => getErrorRate(a.agent_id, windowMinutes, thresholdPct));
}

/**
 * Cleanup rows older than 24h (call in cron or on startup).
 */
export function cleanupOldEntries(): number {
  const info = stmtCleanup.run();
  return info.changes;
}
