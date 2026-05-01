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

// PhD fix 2026-05-01 — Validation des agent_id pour eviter pollution dev en prod
// Probleme decouvert : 34/43 agents en base etaient des artefacts de tests
// (test-*, phd-*, task_breaker_*, maestro_test*, etc.) representant 95% du cout
// Solution : whitelist patterns de prod + warning silencieux pour les autres

const VALID_AGENT_PATTERNS = [
  /^main$/,                                  // bot principal
  /^comms$/,                                 // Sara
  /^content$/,                               // Leo
  /^maestro$/,                               // Maestro
  /^ops$/,                                   // Marco
  /^research$/,                              // Nina
  /^intent_classifier$/,                     // service interne (router)
  /^llm_judge_gemini$/,                      // service interne (garde-fou #4)
  /^(alex|sara|leo|marco|nina|maestro)_[a-z][a-z0-9-]+$/,  // alias multi-tenant <agent>_<userId>
];

// Patterns explicitement bloques (artefacts de tests connus)
const BLOCKED_AGENT_PATTERNS = [
  /^test-/,                                  // test-fix, test-leo, etc.
  /^phd-/,                                   // phd-audit, phd-deep-*
  /^task_breaker_/,                          // task_breaker_test-*
  /^maestro_test/,                           // maestro_test-*
  /^maestro_factory/,                        // maestro_factory-*
  /^maestro_fix/,                            // maestro_fix-*
  /^alex_test/,                              // alex_test-*
];

function isValidAgentId(agentId: string): { valid: boolean; reason?: string } {
  if (!agentId || typeof agentId !== 'string') {
    return { valid: false, reason: 'agent_id missing or not a string' };
  }
  if (agentId.length > 50) {
    return { valid: false, reason: 'agent_id too long (max 50 chars)' };
  }
  // Bloquer artefacts dev connus
  for (const pattern of BLOCKED_AGENT_PATTERNS) {
    if (pattern.test(agentId)) {
      return { valid: false, reason: `agent_id matches blocked dev pattern: ${pattern.source}` };
    }
  }
  // Verifier whitelist
  for (const pattern of VALID_AGENT_PATTERNS) {
    if (pattern.test(agentId)) {
      return { valid: true };
    }
  }
  return { valid: false, reason: `agent_id does not match any known pattern (allowed: main/comms/content/maestro/ops/research, intent_classifier, llm_judge_gemini, or <agent>_<userId>)` };
}

/**
 * Record an LLM cost event for an agent.
 *
 * PhD fix 2026-05-01: Validates agent_id before insert. Invalid IDs
 * (test artefacts, blocked patterns) are logged but NOT recorded.
 * Set BUDGET_TRACKER_STRICT=true to throw instead of silent skip.
 */
export function trackCost(entry: CostEntry): void {
  const validation = isValidAgentId(entry.agent_id);
  if (!validation.valid) {
    const msg = `[budget-tracker] REJECTED agent_id="${entry.agent_id}" cost=$${entry.cost_usd}: ${validation.reason}`;
    if (process.env.BUDGET_TRACKER_STRICT === 'true') {
      throw new Error(msg);
    }
    // eslint-disable-next-line no-console
    console.warn(msg);
    return;
  }
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
export function cleanupBudgetArtefacts(): {
  deleted: number;
  samples: string[];
} {
  // Preview: lister les agent_id qui vont etre purges (pour log)
  const allAgents = db
    .prepare(`SELECT DISTINCT agent_id FROM agent_costs LIMIT 200`)
    .all() as Array<{ agent_id: string }>;

  const samples = allAgents
    .filter((r) => !isValidAgentId(r.agent_id).valid)
    .map((r) => r.agent_id);

  if (samples.length === 0) {
    return { deleted: 0, samples: [] };
  }

  // Suppression en transaction (atomique)
  const stmtDelete = db.prepare(`DELETE FROM agent_costs WHERE agent_id = ?`);
  const tx = db.transaction(() => {
    let total = 0;
    for (const agentId of samples) {
      const info = stmtDelete.run(agentId);
      total += info.changes;
    }
    return total;
  });

  const deleted = tx();
  return { deleted, samples };
}

/**
 * PhD fix 2026-05-01 - Phase 4.2: Cron loop, appelee au boot par index.ts
 * Lance un cleanup a +30s puis chaque 24h.
 */
let cleanupCronInterval: NodeJS.Timeout | null = null;

export function startBudgetCleanupCron(): void {
  if (cleanupCronInterval) return;

  // Premier passage 30s apres le boot (pas immediat pour eviter spike)
  setTimeout(() => {
    try {
      const result = cleanupBudgetArtefacts();
      if (result.deleted > 0) {
        // eslint-disable-next-line no-console
        console.log(
          `[budget-cleanup] Initial sweep: deleted ${result.deleted} dev artefact rows from agent_costs`
        );
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[budget-cleanup] Initial sweep failed', err);
    }
  }, 30_000);

  // Puis cron 24h
  cleanupCronInterval = setInterval(() => {
    try {
      const result = cleanupBudgetArtefacts();
      if (result.deleted > 0) {
        // eslint-disable-next-line no-console
        console.log(
          `[budget-cleanup] Daily sweep: deleted ${result.deleted} dev artefact rows`
        );
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[budget-cleanup] Daily sweep failed', err);
    }
  }, 24 * 60 * 60 * 1000);
}

export function stopBudgetCleanupCron(): void {
  if (cleanupCronInterval) {
    clearInterval(cleanupCronInterval);
    cleanupCronInterval = null;
  }
}

// db instance not exported — use the named functions above
