/**
 * Agent Factory v2 — Sprint 3
 *
 * ONE function call to create a complete, wired agent:
 *   - agents/<id>/ directory with agent.yaml + CLAUDE.md + skills/
 *   - SQLite agents registry entry
 *   - Dynamic DOMAIN_ROUTES refresh signal
 *   - Delegation notifications to concerned agents
 *   - Self-test ping
 *   - Telegram notification for BotFather step (manual) if requested
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { buildSoulPrompt, SoulPromptSpec } from './soul_prompt_builder.js';
import { readEnvFile } from '../env.js';
import { STORE_DIR } from '../config.js';
import { logger } from '../logger.js';

// ── Types ─────────────────────────────────────────────────────────────────

export interface CreateAgentSpec {
  id: string;
  name: string;
  description: string;
  mission?: string;
  role: 'orchestrator' | 'specialist' | 'workhorse';
  soul_traits: string[];
  languages: ('fr' | 'en' | 'es')[];
  skills_needed: string[];
  telegram_bot_required: boolean;
  delegation_rules?: Record<string, string>;
  domain_keywords: string[];
  model?: string;
}

export interface CreateAgentResult {
  agentId: string;
  agentDir: string;
  claudeMdPath: string;
  skillsImported: string[];
  telegramBotUsername?: string;
  selfTestPassed: boolean;
  domainRoutesUpdated: boolean;
  delegationsNotified: string[];
}

const PROJECT_ROOT = process.cwd();
const AGENTS_DIR = path.join(PROJECT_ROOT, 'agents');
const SKILLS_LIBRARY_DIR = path.join(PROJECT_ROOT, 'skills-library');
const KARIM_CHAT_ID = '5566541774';
const MAX_AGENTS = 20;

// ── SQLite helpers ────────────────────────────────────────────────────────

function getDb(): Database.Database {
  const db = new Database(path.join(STORE_DIR, 'claudeclaw.db'));
  db.pragma('journal_mode = WAL');
  return db;
}

function insertAgentRegistry(spec: CreateAgentSpec): void {
  const db = getDb();
  try {
    db.prepare(`
      INSERT OR REPLACE INTO agents
        (id, name, description, mission, role, soul_traits, languages, skills, domain_keywords, delegation_rules, model, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(
      spec.id,
      spec.name,
      spec.description,
      spec.mission ?? null,
      spec.role,
      JSON.stringify(spec.soul_traits),
      JSON.stringify(spec.languages),
      JSON.stringify(spec.skills_needed),
      JSON.stringify(spec.domain_keywords),
      JSON.stringify(spec.delegation_rules ?? {}),
      spec.model ?? 'claude-sonnet-4-6',
    );
  } finally {
    db.close();
  }
}

function deleteAgentRegistry(agentId: string): void {
  const db = getDb();
  try {
    db.prepare("DELETE FROM agents WHERE id = ?").run(agentId);
  } finally {
    db.close();
  }
}

function countActiveAgents(): number {
  const db = getDb();
  try {
    const row = db.prepare("SELECT COUNT(*) as n FROM agents WHERE status = 'active'").get() as { n: number };
    return row.n;
  } finally {
    db.close();
  }
}

// ── Telegram helper ───────────────────────────────────────────────────────

async function sendTelegram(text: string): Promise<void> {
  const envVars = readEnvFile(['TELEGRAM_BOT_TOKEN']);
  const token = process.env['TELEGRAM_BOT_TOKEN'] ?? envVars['TELEGRAM_BOT_TOKEN'] ?? '';
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: KARIM_CHAT_ID, text, parse_mode: 'Markdown' }),
    });
  } catch {
    // Non-blocking
  }
}

// ── File helpers ──────────────────────────────────────────────────────────

function createAgentDirectory(agentId: string): string {
  const agentDir = path.join(AGENTS_DIR, agentId);
  fs.mkdirSync(path.join(agentDir, 'skills'), { recursive: true });
  return agentDir;
}

function writeAgentYaml(agentDir: string, spec: CreateAgentSpec): void {
  const yaml = `id: ${spec.id}
name: ${spec.name}
description: "${spec.description.replace(/"/g, "'")}"
role: ${spec.role}
model: ${spec.model ?? 'claude-sonnet-4-6'}
soul_traits: ${JSON.stringify(spec.soul_traits)}
languages: ${JSON.stringify(spec.languages)}
skills: ${JSON.stringify(spec.skills_needed)}
domain_keywords: ${JSON.stringify(spec.domain_keywords)}
${spec.telegram_bot_required ? 'telegram_bot_token_env: ' + spec.id.toUpperCase() + '_BOT_TOKEN' : '# telegram_bot: not required'}
created_at: ${new Date().toISOString()}
`;
  fs.writeFileSync(path.join(agentDir, 'agent.yaml'), yaml, 'utf-8');
}

function copySkillsFromLibrary(agentDir: string, skillsNeeded: string[]): string[] {
  const imported: string[] = [];
  const agentSkillsDir = path.join(agentDir, 'skills');

  for (const skillName of skillsNeeded) {
    // Search in skills-library/<category>/<skill>/
    if (!fs.existsSync(SKILLS_LIBRARY_DIR)) continue;

    let found = false;
    const categories = fs.readdirSync(SKILLS_LIBRARY_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory());

    for (const cat of categories) {
      const skillSrc = path.join(SKILLS_LIBRARY_DIR, cat.name, skillName);
      if (fs.existsSync(skillSrc)) {
        const skillDest = path.join(agentSkillsDir, skillName);
        fs.mkdirSync(skillDest, { recursive: true });
        // Copy SKILL.md
        const skillMd = path.join(skillSrc, 'SKILL.md');
        if (fs.existsSync(skillMd)) {
          fs.copyFileSync(skillMd, path.join(skillDest, 'SKILL.md'));
          imported.push(skillName);
          found = true;
        }
        break;
      }
    }

    if (!found) {
      logger.warn(`agent_factory_v2.skill_not_found skill=${skillName}`);
    }
  }

  return imported;
}

// ── Self-test ─────────────────────────────────────────────────────────────

async function runSelfTest(agentId: string, agentName: string): Promise<boolean> {
  try {
    const { delegateToAgent } = await import('../orchestrator.js');
    const result = await delegateToAgent(
      agentId,
      `Présente-toi en 3 lignes en français. Qui es-tu, quel est ton rôle, que peux-tu faire?`,
      'factory_self_test',
      'main'
    );
    const text = result.text ?? '';
    const passed = text.length >= 80 && (
      text.toLowerCase().includes(agentName.toLowerCase()) ||
      text.toLowerCase().includes(agentId.toLowerCase())
    );
    logger.info(`agent_factory_v2.self_test agentId=${agentId} passed=${passed} len=${text.length}`);
    return passed;
  } catch (err) {
    logger.warn(`agent_factory_v2.self_test_error agentId=${agentId} err=${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

// ── Domain routes refresh ─────────────────────────────────────────────────

let _domainRoutesCache: Array<{ agentId: string; keywords: string[] }> | null = null;

export function refreshDomainRoutesCache(): void {
  _domainRoutesCache = null;
  logger.info('agent_factory_v2.domain_routes_cache_cleared');
}

export function loadDomainRoutes(): Array<{ agentId: string; keywords: string[]; patterns: RegExp[] }> {
  if (_domainRoutesCache !== null) {
    return _domainRoutesCache.map(r => ({
      ...r,
      patterns: r.keywords.map(k => new RegExp(`\\b${k}\\b`, 'i')),
    }));
  }

  const db = getDb();
  try {
    const rows = db.prepare(
      "SELECT id, domain_keywords FROM agents WHERE status = 'active'"
    ).all() as Array<{ id: string; domain_keywords: string }>;

    if (rows.length === 0) {
      logger.warn('agent_factory_v2.load_domain_routes empty registry — fallback to hardcoded');
      return [];
    }

    _domainRoutesCache = rows.map(row => ({
      agentId: row.id,
      keywords: (() => {
        try { return JSON.parse(row.domain_keywords) as string[]; } catch { return []; }
      })(),
    }));

    logger.info(`agent_factory_v2.load_domain_routes loaded ${rows.length} agents`);
    return _domainRoutesCache.map(r => ({
      ...r,
      patterns: r.keywords.map(k => new RegExp(`\\b${k}\\b`, 'i')),
    }));
  } finally {
    db.close();
  }
}

// ── Main createAgent function ─────────────────────────────────────────────

export async function createAgent(spec: CreateAgentSpec): Promise<CreateAgentResult> {
  // ── 1. Validate ──────────────────────────────────────────────────────
  if (!/^[a-z][a-z0-9_]{0,29}$/.test(spec.id)) {
    throw new Error(`Invalid agent id "${spec.id}": must match /^[a-z][a-z0-9_]{0,29}$/`);
  }

  const agentDir = path.join(AGENTS_DIR, spec.id);
  if (fs.existsSync(agentDir)) {
    throw new Error(`Agent directory already exists: ${agentDir}`);
  }

  const activeCount = countActiveAgents();
  if (activeCount >= MAX_AGENTS) {
    throw new Error(`Max agent limit reached (${MAX_AGENTS}). Archive an existing agent first.`);
  }

  logger.info(`agent_factory_v2.create_start agentId=${spec.id}`);

  // ── 2. Create directory + agent.yaml ─────────────────────────────────
  const createdAgentDir = createAgentDirectory(spec.id);
  writeAgentYaml(createdAgentDir, spec);

  // ── 3. Build CLAUDE.md via SoulPrompts ───────────────────────────────
  const soulSpec: SoulPromptSpec = {
    agentId: spec.id,
    agentName: spec.name,
    agentDescription: spec.description,
    role: spec.role,
    traits: spec.soul_traits,
    languages: spec.languages,
    customMission: spec.mission,
    delegationRules: spec.delegation_rules
      ? Object.entries(spec.delegation_rules)
          .map(([agent, rule]) => `- ${agent}: ${rule}`)
          .join('\n')
      : undefined,
  };

  const claudeMdContent = buildSoulPrompt(soulSpec);
  const claudeMdPath = path.join(createdAgentDir, 'CLAUDE.md');
  fs.writeFileSync(claudeMdPath, claudeMdContent, 'utf-8');

  // ── 4. Copy skills from library ───────────────────────────────────────
  const skillsImported = copySkillsFromLibrary(createdAgentDir, spec.skills_needed);

  // ── 5. Telegram bot — manual workflow ────────────────────────────────
  let telegramBotUsername: string | undefined;
  if (spec.telegram_bot_required) {
    await sendTelegram(
      `🤖 *Nouvel agent créé: ${spec.name}*\n\n` +
      `Pour activer son bot Telegram :\n` +
      `1. Ouvre @BotFather\n` +
      `2. Crée un nouveau bot pour "${spec.name}"\n` +
      `3. Réponds-moi avec : \`/registerbot ${spec.id} <TOKEN>\`\n\n` +
      `Le self-test se relancera automatiquement après enregistrement.`
    );
  }

  // ── 6. Insert into SQLite registry ───────────────────────────────────
  insertAgentRegistry(spec);

  // ── 7. Refresh domain routes cache ───────────────────────────────────
  refreshDomainRoutesCache();
  const domainRoutesUpdated = true;

  // ── 8. Delegation notifications ───────────────────────────────────────
  const delegationsNotified: string[] = [];
  if (spec.delegation_rules) {
    for (const [targetAgent, rule] of Object.entries(spec.delegation_rules)) {
      try {
        const db = getDb();
        try {
          db.prepare(`
            INSERT INTO hive_mind (agent_id, chat_id, action, summary, created_at)
            VALUES ('factory', '${KARIM_CHAT_ID}', 'new_agent_delegation',
                    'New agent ${spec.id} (${spec.name}) has delegation rule for ${targetAgent}: ${rule}',
                    strftime('%s','now'))
          `).run();
        } finally {
          db.close();
        }
        delegationsNotified.push(targetAgent);
      } catch {
        // Non-blocking
      }
    }
  }

  // ── 9. Self-test ──────────────────────────────────────────────────────
  const selfTestPassed = await runSelfTest(spec.id, spec.name);

  // ── 10. Final notification ────────────────────────────────────────────
  await sendTelegram(
    `✅ *Agent Factory v2 — Agent créé*\n\n` +
    `*ID*: \`${spec.id}\`\n` +
    `*Nom*: ${spec.name}\n` +
    `*Role*: ${spec.role}\n` +
    `*Skills importés*: ${skillsImported.length > 0 ? skillsImported.join(', ') : 'aucun'}\n` +
    `*Self-test*: ${selfTestPassed ? '✅ PASS' : '⚠️ FAIL (agent créé mais ne répond pas encore)'}\n` +
    `${spec.telegram_bot_required ? '⚠️ Bot Telegram: en attente de /registerbot' : ''}`
  );

  logger.info(`agent_factory_v2.create_done agentId=${spec.id} skills=${skillsImported.length} selfTest=${selfTestPassed}`);

  return {
    agentId: spec.id,
    agentDir: createdAgentDir,
    claudeMdPath,
    skillsImported,
    telegramBotUsername,
    selfTestPassed,
    domainRoutesUpdated,
    delegationsNotified,
  };
}

/**
 * Delete an agent created by the factory.
 * Moves the directory to agents/_archive/, removes from registry.
 */
export function archiveAgent(agentId: string): void {
  const agentDir = path.join(AGENTS_DIR, agentId);
  if (!fs.existsSync(agentDir)) {
    throw new Error(`Agent directory not found: ${agentDir}`);
  }

  const archiveDir = path.join(AGENTS_DIR, '_archive', `${agentId}_${Date.now()}`);
  fs.mkdirSync(path.dirname(archiveDir), { recursive: true });
  fs.renameSync(agentDir, archiveDir);

  deleteAgentRegistry(agentId);
  refreshDomainRoutesCache();

  logger.info(`agent_factory_v2.archived agentId=${agentId} archivePath=${archiveDir}`);
}
