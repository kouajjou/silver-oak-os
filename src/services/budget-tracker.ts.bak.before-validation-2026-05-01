/**
 * SQLite-based persistent budget tracker for agents (gap-020).
 *
 * Tracks LLM costs per agent with daily/monthly caps.
 * Uses better-sqlite3 with WAL mode for concurrency safety.
 * Database stored at: data/budget-tracker.db (gitignored)
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'budget-tracker.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS agent_costs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id    TEXT    NOT NULL,
    cost_usd    REAL    NOT NULL,
    tokens_in   INTEGER DEFAULT 0,
    tokens_out  INTEGER DEFAULT 0,
    model       TEXT,
    timestamp   INTEGER DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_agent_id  ON agent_costs(agent_id);
  CREATE INDEX IF NOT EXISTS idx_timestamp ON agent_costs(timestamp);

  CREATE TABLE IF NOT EXISTS agent_budgets (
    agent_id        TEXT PRIMARY KEY,
    daily_cap_usd   REAL DEFAULT 3.0,
    monthly_cap_usd REAL DEFAULT 50.0,
    updated_at      INTEGER DEFAULT (unixepoch())
  );
`);

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

const stmtInsertCost = db.prepare(
  'INSERT INTO agent_costs (agent_id, cost_usd, tokens_in, tokens_out, model) VALUES (?, ?, ?, ?, ?)',
);

const stmtDailyTotal = db.prepare(
  'SELECT COALESCE(SUM(cost_usd), 0) AS total FROM agent_costs WHERE agent_id = ? AND timestamp > ?',
);

const stmtMonthlyTotal = db.prepare(
  'SELECT COALESCE(SUM(cost_usd), 0) AS total FROM agent_costs WHERE agent_id = ? AND timestamp > ?',
);

const stmtGetBudget = db.prepare(
  'SELECT daily_cap_usd, monthly_cap_usd FROM agent_budgets WHERE agent_id = ?',
);

const stmtSetBudget = db.prepare(
  'INSERT OR REPLACE INTO agent_budgets (agent_id, daily_cap_usd, monthly_cap_usd, updated_at) VALUES (?, ?, ?, unixepoch())',
);

/**
 * Record an LLM cost event for an agent.
 */
export function trackCost(entry: CostEntry): void {
  stmtInsertCost.run(
    entry.agent_id,
    entry.cost_usd,
    entry.tokens_in ?? 0,
    entry.tokens_out ?? 0,
    entry.model ?? 'unknown',
  );
}

/**
 * Get total cost for an agent in the last 24 hours.
 */
export function getAgentDailyTotal(agent_id: string): number {
  const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
  const row = stmtDailyTotal.get(agent_id, oneDayAgo) as { total: number };
  return row.total;
}

/**
 * Get total cost for an agent in the last 30 days.
 */
export function getAgentMonthlyTotal(agent_id: string): number {
  const oneMonthAgo = Math.floor(Date.now() / 1000) - 2592000;
  const row = stmtMonthlyTotal.get(agent_id, oneMonthAgo) as { total: number };
  return row.total;
}

/**
 * Set daily and monthly budget caps for an agent.
 * Defaults: daily=3.0 USD, monthly=50.0 USD.
 */
export function setAgentBudget(agent_id: string, daily_cap_usd: number, monthly_cap_usd: number): void {
  stmtSetBudget.run(agent_id, daily_cap_usd, monthly_cap_usd);
}

/**
 * Check current budget status for an agent.
 * Returns usage percentages and whether the agent is over budget.
 */
export function checkBudgetStatus(agent_id: string): BudgetStatus {
  const budget = stmtGetBudget.get(agent_id) as
    | { daily_cap_usd: number; monthly_cap_usd: number }
    | undefined;

  const daily_cap = budget?.daily_cap_usd ?? 3.0;
  const monthly_cap = budget?.monthly_cap_usd ?? 50.0;
  const daily_used = getAgentDailyTotal(agent_id);
  const monthly_used = getAgentMonthlyTotal(agent_id);

  return {
    daily_used,
    daily_cap,
    daily_pct: (daily_used / daily_cap) * 100,
    monthly_used,
    monthly_cap,
    monthly_pct: (monthly_used / monthly_cap) * 100,
    over_budget: daily_used >= daily_cap || monthly_used >= monthly_cap,
  };
}

/**
 * Get all agents' daily and monthly cost totals.
 */
export function getAllAgentsCosts(): Array<{ agent_id: string; daily: number; monthly: number }> {
  const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
  const oneMonthAgo = Math.floor(Date.now() / 1000) - 2592000;

  return db.prepare(`
    SELECT
      agent_id,
      COALESCE(SUM(CASE WHEN timestamp > ? THEN cost_usd ELSE 0 END), 0) AS daily,
      COALESCE(SUM(CASE WHEN timestamp > ? THEN cost_usd ELSE 0 END), 0) AS monthly
    FROM agent_costs
    GROUP BY agent_id
  `).all(oneDayAgo, oneMonthAgo) as Array<{ agent_id: string; daily: number; monthly: number }>;
}

// db instance not exported — use the named functions above
