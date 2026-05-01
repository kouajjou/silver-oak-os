/**
 * Token Validator — PhD fix 2026-05-01 - Phase 4.4
 *
 * Au boot, valide les credentials externes critiques :
 *   - TELEGRAM_BOT_TOKEN -> getMe() Telegram API
 *   - GOOGLE_API_KEY     -> models.list Gemini API
 *   - OPENAI_API_KEY     -> /v1/models OpenAI API
 *   - DEEPSEEK_API_KEY   -> /v1/models DeepSeek API
 *   - XAI_API_KEY        -> /v1/models xAI API
 *   - PERPLEXITY_API_KEY -> /v1/models Perplexity API
 *
 * Les resultats sont logges dans pino (structured) ET dans une table SQLite
 * pour query par dashboard. Une alerte Telegram est envoyee si un token critique
 * (TELEGRAM_BOT_TOKEN, GOOGLE_API_KEY) est invalide.
 *
 * Non-bloquant : un token invalide ne plante PAS le boot, juste warn.
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from '../logger.js';
import { readEnvFile } from '../env.js';
import { TELEGRAM_BOT_TOKEN, ALLOWED_CHAT_ID } from '../config.js';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'token-validation.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS token_status (
    name           TEXT PRIMARY KEY,
    valid          INTEGER NOT NULL DEFAULT 0,
    last_check_ts  INTEGER NOT NULL,
    error_msg      TEXT,
    response_ms    INTEGER DEFAULT 0
  );
`);

const stmtUpsert = db.prepare(`
  INSERT INTO token_status (name, valid, last_check_ts, error_msg, response_ms)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(name) DO UPDATE SET
    valid = excluded.valid,
    last_check_ts = excluded.last_check_ts,
    error_msg = excluded.error_msg,
    response_ms = excluded.response_ms
`);

interface TokenCheckResult {
  name: string;
  valid: boolean;
  error?: string;
  response_ms: number;
}

// HTTP helper avec timeout 10s
async function httpCheck(url: string, headers: Record<string, string>): Promise<{ ok: boolean; status: number; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Per-provider checkers ───────────────────────────────────────────────

async function checkTelegram(name: string, token: string): Promise<TokenCheckResult> {
  const start = Date.now();
  if (!token || token.length < 20) {
    return { name, valid: false, error: 'token missing or too short', response_ms: 0 };
  }
  const r = await httpCheck(`https://api.telegram.org/bot${token}/getMe`, {});
  return {
    name,
    valid: r.ok,
    error: r.ok ? undefined : `HTTP ${r.status}${r.error ? `: ${r.error}` : ''}`,
    response_ms: Date.now() - start,
  };
}

async function checkGemini(name: string, key: string): Promise<TokenCheckResult> {
  const start = Date.now();
  if (!key || key.length < 20) {
    return { name, valid: false, error: 'key missing', response_ms: 0 };
  }
  const r = await httpCheck(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
    {}
  );
  return {
    name,
    valid: r.ok,
    error: r.ok ? undefined : `HTTP ${r.status}${r.error ? `: ${r.error}` : ''}`,
    response_ms: Date.now() - start,
  };
}

async function checkOpenAICompat(name: string, key: string, baseUrl: string): Promise<TokenCheckResult> {
  const start = Date.now();
  if (!key || key.length < 20) {
    return { name, valid: false, error: 'key missing', response_ms: 0 };
  }
  const r = await httpCheck(`${baseUrl}/models`, { Authorization: `Bearer ${key}` });
  return {
    name,
    valid: r.ok,
    error: r.ok ? undefined : `HTTP ${r.status}${r.error ? `: ${r.error}` : ''}`,
    response_ms: Date.now() - start,
  };
}

// ── Telegram alerte ─────────────────────────────────────────────────────

async function sendInvalidTokenAlert(invalidCritical: TokenCheckResult[]): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !ALLOWED_CHAT_ID || invalidCritical.length === 0) return;
  const lines = invalidCritical.map((t) => `• \`${t.name}\` — ${t.error ?? 'invalid'}`);
  const text =
    `⚠️ *Tokens invalides au boot*\n` +
    lines.join('\n') +
    `\n\nVoir \`/api/maestro/tokens\` pour le statut complet.`;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: ALLOWED_CHAT_ID, text, parse_mode: 'Markdown' }),
    });
  } catch (err) {
    logger.warn({ err }, '[token-validator] Failed to send Telegram alert');
  }
}

// ── Public API ───────────────────────────────────────────────────────────

const CRITICAL_TOKENS = new Set(['TELEGRAM_BOT_TOKEN', 'GOOGLE_API_KEY']);

/**
 * Lance la validation de tous les tokens. Non-bloquant.
 * Doit etre appelee une fois au boot par index.ts.
 */
export async function validateAllTokens(): Promise<TokenCheckResult[]> {
  const env = readEnvFile([
    'TELEGRAM_BOT_TOKEN',
    'GOOGLE_API_KEY',
    'OPENAI_API_KEY',
    'DEEPSEEK_API_KEY',
    'XAI_API_KEY',
    'GROK_API_KEY',
    'PERPLEXITY_API_KEY',
    'COMMS_TELEGRAM_TOKEN',
    'CONTENT_TELEGRAM_TOKEN',
    'RESEARCH_TELEGRAM_TOKEN',
    'OPS_TELEGRAM_TOKEN',
    'MAESTRO_TELEGRAM_TOKEN',
  ]);

  const checks: Promise<TokenCheckResult>[] = [];

  // Bot tokens (skip those absent)
  for (const k of [
    'TELEGRAM_BOT_TOKEN',
    'COMMS_TELEGRAM_TOKEN',
    'CONTENT_TELEGRAM_TOKEN',
    'RESEARCH_TELEGRAM_TOKEN',
    'OPS_TELEGRAM_TOKEN',
    'MAESTRO_TELEGRAM_TOKEN',
  ]) {
    if (env[k]) checks.push(checkTelegram(k, env[k]));
  }

  if (env['GOOGLE_API_KEY']) {
    checks.push(checkGemini('GOOGLE_API_KEY', env['GOOGLE_API_KEY']));
  }
  if (env['OPENAI_API_KEY']) {
    checks.push(checkOpenAICompat('OPENAI_API_KEY', env['OPENAI_API_KEY'], 'https://api.openai.com/v1'));
  }
  if (env['DEEPSEEK_API_KEY']) {
    checks.push(checkOpenAICompat('DEEPSEEK_API_KEY', env['DEEPSEEK_API_KEY'], 'https://api.deepseek.com/v1'));
  }
  // Grok / xAI : env var name varie
  const xaiKey = env['XAI_API_KEY'] || env['GROK_API_KEY'];
  const xaiName = env['XAI_API_KEY'] ? 'XAI_API_KEY' : 'GROK_API_KEY';
  if (xaiKey) {
    checks.push(checkOpenAICompat(xaiName, xaiKey, 'https://api.x.ai/v1'));
  }
  if (env['PERPLEXITY_API_KEY']) {
    checks.push(checkOpenAICompat('PERPLEXITY_API_KEY', env['PERPLEXITY_API_KEY'], 'https://api.perplexity.ai'));
  }

  const results = await Promise.all(checks);
  const ts = Math.floor(Date.now() / 1000);

  // Persist en SQLite
  for (const r of results) {
    try {
      stmtUpsert.run(r.name, r.valid ? 1 : 0, ts, r.error ?? null, r.response_ms);
    } catch (err) {
      logger.warn({ err, name: r.name }, '[token-validator] db upsert failed');
    }
  }

  // Log structured
  const okCount = results.filter((r) => r.valid).length;
  const failCount = results.length - okCount;
  logger.info(
    { total: results.length, ok: okCount, fail: failCount },
    '[token-validator] Boot validation complete'
  );

  for (const r of results) {
    if (!r.valid) {
      logger.warn(
        { token: r.name, error: r.error, response_ms: r.response_ms },
        '[token-validator] Invalid'
      );
    }
  }

  // Alerte Telegram pour les criticals invalides
  const invalidCritical = results.filter((r) => !r.valid && CRITICAL_TOKENS.has(r.name));
  if (invalidCritical.length > 0) {
    sendInvalidTokenAlert(invalidCritical).catch(() => { /* non-blocking */ });
  }

  return results;
}

/**
 * Lecture du dernier statut depuis SQLite (pour API dashboard).
 */
export function getTokenStatuses(): Array<{
  name: string;
  valid: boolean;
  last_check_ts: number;
  error_msg: string | null;
  response_ms: number;
}> {
  return (db
    .prepare(`SELECT name, valid, last_check_ts, error_msg, response_ms FROM token_status ORDER BY name`)
    .all() as Array<{
      name: string;
      valid: number;
      last_check_ts: number;
      error_msg: string | null;
      response_ms: number;
    }>).map((r) => ({
      ...r,
      valid: r.valid === 1,
    }));
}
