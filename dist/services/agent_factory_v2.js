/**
 * Agent Factory v2 — Sprint 3 + Sprint 4 (Maestro Auto-Wiring)
 *
 * ONE function call to create a complete, wired agent:
 *   - agents/<id>/ directory with agent.yaml + CLAUDE.md + skills/
 *   - SQLite agents registry entry
 *   - Dynamic DOMAIN_ROUTES refresh signal
 *   - Delegation notifications to concerned agents
 *   - Auto-Maestro delegation block injected in CLAUDE.md (Option C)
 *   - Self-test ping
 *   - Telegram notification for BotFather step (manual) if requested
 *
 * SOP V26 — Maestro is SACRED:
 *   - createAgent({id: 'maestro'}) is BLOCKED
 *   - Maestro CLAUDE.md / skills / agent.yaml are NEVER touched by the factory
 *   - Every new agent (except Alex orchestrator) auto-knows Maestro can handle tech tasks
 */
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { buildSoulPrompt } from './soul_prompt_builder.js';
import { readEnvFile } from '../env.js';
import { STORE_DIR } from '../config.js';
import { logger } from '../logger.js';
const PROJECT_ROOT = process.cwd();
const AGENTS_DIR = path.join(PROJECT_ROOT, 'agents');
const SKILLS_LIBRARY_DIR = path.join(PROJECT_ROOT, 'skills-library');
const KARIM_CHAT_ID = '5566541774';
const MAX_AGENTS = 20;
/**
 * SOP V26 — Maestro is SACRED.
 * The factory cannot create, overwrite, or modify Maestro.
 * Maestro's CLAUDE.md (371 lines) + skills + agent.yaml are managed by hand only.
 */
const PROTECTED_AGENT_IDS = new Set(['maestro']);
/**
 * Sprint 4 — Auto-Maestro delegation block.
 * Injected into every new agent's CLAUDE.md (except orchestrators and Maestro himself).
 * Trilingual to match SoulPrompts standard.
 */
const MAESTRO_AUTO_DELEGATION_BLOCK = `
---

## 🛠️ Délégation à Maestro (auto-wired par Agent Factory v2)

### FR
Pour toutes les tâches techniques (code, deploy, debug, audit, infra, refactor, tests, security review),
tu peux déléguer DIRECTEMENT à Maestro sans passer par Alex.
Maestro est le CTO de Silver Oak OS et orchestre lui-même les workers techniques.

Comment déléguer : utilise \`@maestro: <ta demande>\` ou appelle \`delegateToAgent('maestro', <prompt>)\`.

### EN
For any technical task (code, deploy, debug, audit, infra, refactor, tests, security review),
you can delegate DIRECTLY to Maestro without going through Alex.
Maestro is the CTO of Silver Oak OS and orchestrates the technical workers himself.

How to delegate: use \`@maestro: <your request>\` or call \`delegateToAgent('maestro', <prompt>)\`.

### ES
Para cualquier tarea técnica (código, despliegue, debug, auditoría, infra, refactor, tests, revisión de seguridad),
puedes delegar DIRECTAMENTE a Maestro sin pasar por Alex.
Maestro es el CTO de Silver Oak OS y orquesta él mismo los workers técnicos.

Cómo delegar: usa \`@maestro: <tu solicitud>\` o llama a \`delegateToAgent('maestro', <prompt>)\`.

---
`;
// ── SQLite helpers ────────────────────────────────────────────────────────
function getDb() {
    const db = new Database(path.join(STORE_DIR, 'claudeclaw.db'));
    db.pragma('journal_mode = WAL');
    return db;
}
function insertAgentRegistry(spec) {
    const db = getDb();
    try {
        db.prepare(`
      INSERT OR REPLACE INTO agents
        (id, name, description, mission, role, soul_traits, languages, skills, domain_keywords, delegation_rules, model, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(spec.id, spec.name, spec.description, spec.mission ?? null, spec.role, JSON.stringify(spec.soul_traits), JSON.stringify(spec.languages), JSON.stringify(spec.skills_needed), JSON.stringify(spec.domain_keywords), JSON.stringify(spec.delegation_rules ?? {}), spec.model ?? 'claude-sonnet-4-6');
    }
    finally {
        db.close();
    }
}
function deleteAgentRegistry(agentId) {
    const db = getDb();
    try {
        db.prepare("DELETE FROM agents WHERE id = ?").run(agentId);
    }
    finally {
        db.close();
    }
}
function countActiveAgents() {
    const db = getDb();
    try {
        const row = db.prepare("SELECT COUNT(*) as n FROM agents WHERE status = 'active'").get();
        return row.n;
    }
    finally {
        db.close();
    }
}
// ── Telegram helper ───────────────────────────────────────────────────────
async function sendTelegram(text) {
    const envVars = readEnvFile(['TELEGRAM_BOT_TOKEN']);
    const token = process.env['TELEGRAM_BOT_TOKEN'] ?? envVars['TELEGRAM_BOT_TOKEN'] ?? '';
    if (!token)
        return;
    try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: KARIM_CHAT_ID, text, parse_mode: 'Markdown' }),
        });
    }
    catch {
        // Non-blocking
    }
}
// ── File helpers ──────────────────────────────────────────────────────────
function createAgentDirectory(agentId) {
    const agentDir = path.join(AGENTS_DIR, agentId);
    fs.mkdirSync(path.join(agentDir, 'skills'), { recursive: true });
    return agentDir;
}
function writeAgentYaml(agentDir, spec) {
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
auto_delegate_to_maestro: ${spec.auto_delegate_to_maestro !== false}
created_at: ${new Date().toISOString()}
`;
    fs.writeFileSync(path.join(agentDir, 'agent.yaml'), yaml, 'utf-8');
}
function copySkillsFromLibrary(agentDir, skillsNeeded) {
    const imported = [];
    const agentSkillsDir = path.join(agentDir, 'skills');
    for (const skillName of skillsNeeded) {
        // Search in skills-library/<category>/<skill>/
        if (!fs.existsSync(SKILLS_LIBRARY_DIR))
            continue;
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
/**
 * Sprint 4 — Decide whether to inject the Maestro auto-delegation block.
 * Logic:
 *   - Maestro himself: NEVER (he doesn't delegate to himself).
 *   - Orchestrators (Alex/main): NO (Alex orchestrates Maestro already at higher level).
 *   - Explicit opt-out (auto_delegate_to_maestro: false): NO.
 *   - Otherwise: YES (every specialist/workhorse can delegate to Maestro).
 */
function shouldInjectMaestroBlock(spec) {
    if (spec.id === 'maestro')
        return false;
    if (spec.id === 'main')
        return false;
    if (spec.role === 'orchestrator')
        return false;
    if (spec.auto_delegate_to_maestro === false)
        return false;
    return true;
}
// ── Self-test ─────────────────────────────────────────────────────────────
async function runSelfTest(agentId, agentName) {
    try {
        const { delegateToAgent } = await import('../orchestrator.js');
        const result = await delegateToAgent(agentId, `Présente-toi en 3 lignes en français. Qui es-tu, quel est ton rôle, que peux-tu faire?`, 'factory_self_test', 'main');
        const text = result.text ?? '';
        const passed = text.length >= 80 && (text.toLowerCase().includes(agentName.toLowerCase()) ||
            text.toLowerCase().includes(agentId.toLowerCase()));
        logger.info(`agent_factory_v2.self_test agentId=${agentId} passed=${passed} len=${text.length}`);
        return passed;
    }
    catch (err) {
        logger.warn(`agent_factory_v2.self_test_error agentId=${agentId} err=${err instanceof Error ? err.message : String(err)}`);
        return false;
    }
}
// ── Domain routes refresh ─────────────────────────────────────────────────
let _domainRoutesCache = null;
export function refreshDomainRoutesCache() {
    _domainRoutesCache = null;
    logger.info('agent_factory_v2.domain_routes_cache_cleared');
}
export function loadDomainRoutes() {
    if (_domainRoutesCache !== null) {
        return _domainRoutesCache.map(r => ({
            ...r,
            patterns: r.keywords.map(k => new RegExp(`\\b${k}\\b`, 'i')),
        }));
    }
    const db = getDb();
    try {
        const rows = db.prepare("SELECT id, domain_keywords FROM agents WHERE status = 'active'").all();
        if (rows.length === 0) {
            logger.warn('agent_factory_v2.load_domain_routes empty registry — fallback to hardcoded');
            return [];
        }
        _domainRoutesCache = rows.map(row => ({
            agentId: row.id,
            keywords: (() => {
                try {
                    return JSON.parse(row.domain_keywords);
                }
                catch {
                    return [];
                }
            })(),
        }));
        logger.info(`agent_factory_v2.load_domain_routes loaded ${rows.length} agents`);
        return _domainRoutesCache.map(r => ({
            ...r,
            patterns: r.keywords.map(k => new RegExp(`\\b${k}\\b`, 'i')),
        }));
    }
    finally {
        db.close();
    }
}
// ── Main createAgent function ─────────────────────────────────────────────
export async function createAgent(spec) {
    // ── 0. SOP V26 — Maestro is SACRED ───────────────────────────────────
    if (PROTECTED_AGENT_IDS.has(spec.id)) {
        throw new Error(`Agent "${spec.id}" is PROTECTED (SOP V26 — sacred agents). ` +
            `Maestro and other protected agents must be edited by hand only, never via the factory.`);
    }
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
    // ── 3. Build CLAUDE.md via SoulPrompts + Maestro auto-block ──────────
    const soulSpec = {
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
    let claudeMdContent = buildSoulPrompt(soulSpec);
    // Sprint 4 — Inject Maestro auto-delegation block (Option C)
    const maestroAutoDelegationInjected = shouldInjectMaestroBlock(spec);
    if (maestroAutoDelegationInjected) {
        claudeMdContent += MAESTRO_AUTO_DELEGATION_BLOCK;
        logger.info(`agent_factory_v2.maestro_auto_delegation_injected agentId=${spec.id}`);
    }
    const claudeMdPath = path.join(createdAgentDir, 'CLAUDE.md');
    fs.writeFileSync(claudeMdPath, claudeMdContent, 'utf-8');
    // ── 4. Copy skills from library ───────────────────────────────────────
    const skillsImported = copySkillsFromLibrary(createdAgentDir, spec.skills_needed);
    // ── 5. Telegram bot — manual workflow ────────────────────────────────
    const telegramBotUsername = undefined;
    if (spec.telegram_bot_required) {
        await sendTelegram(`🤖 *Nouvel agent créé: ${spec.name}*\n\n` +
            `Pour activer son bot Telegram :\n` +
            `1. Ouvre @BotFather\n` +
            `2. Crée un nouveau bot pour "${spec.name}"\n` +
            `3. Réponds-moi avec : \`/registerbot ${spec.id} <TOKEN>\`\n\n` +
            `Le self-test se relancera automatiquement après enregistrement.`);
    }
    // ── 6. Insert into SQLite registry ───────────────────────────────────
    insertAgentRegistry(spec);
    // ── 7. Refresh domain routes cache ───────────────────────────────────
    refreshDomainRoutesCache();
    const domainRoutesUpdated = true;
    // ── 8. Delegation notifications ───────────────────────────────────────
    const delegationsNotified = [];
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
                }
                finally {
                    db.close();
                }
                delegationsNotified.push(targetAgent);
            }
            catch {
                // Non-blocking
            }
        }
    }
    // Sprint 4 — Notify Maestro hive_mind that a new agent now knows it can delegate to him
    if (maestroAutoDelegationInjected) {
        try {
            const db = getDb();
            try {
                db.prepare(`
          INSERT INTO hive_mind (agent_id, chat_id, action, summary, created_at)
          VALUES ('factory', '${KARIM_CHAT_ID}', 'maestro_auto_wired',
                  'Maestro auto-delegation wired into ${spec.id} (${spec.name}). New agent can delegate tech tasks directly to Maestro.',
                  strftime('%s','now'))
        `).run();
            }
            finally {
                db.close();
            }
            delegationsNotified.push('maestro');
        }
        catch {
            // Non-blocking
        }
    }
    // ── 9. Self-test ──────────────────────────────────────────────────────
    const selfTestPassed = await runSelfTest(spec.id, spec.name);
    // ── 10. Final notification ────────────────────────────────────────────
    await sendTelegram(`✅ *Agent Factory v2 — Agent créé*\n\n` +
        `*ID*: \`${spec.id}\`\n` +
        `*Nom*: ${spec.name}\n` +
        `*Role*: ${spec.role}\n` +
        `*Skills importés*: ${skillsImported.length > 0 ? skillsImported.join(', ') : 'aucun'}\n` +
        `*Maestro auto-wired*: ${maestroAutoDelegationInjected ? '✅ oui' : '⏭️ non (orchestrator)'}\n` +
        `*Self-test*: ${selfTestPassed ? '✅ PASS' : '⚠️ FAIL (agent créé mais ne répond pas encore)'}\n` +
        `${spec.telegram_bot_required ? '⚠️ Bot Telegram: en attente de /registerbot' : ''}`);
    logger.info(`agent_factory_v2.create_done agentId=${spec.id} skills=${skillsImported.length} selfTest=${selfTestPassed} maestroAutoWired=${maestroAutoDelegationInjected}`);
    return {
        agentId: spec.id,
        agentDir: createdAgentDir,
        claudeMdPath,
        skillsImported,
        telegramBotUsername,
        selfTestPassed,
        domainRoutesUpdated,
        delegationsNotified,
        maestroAutoDelegationInjected,
    };
}
/**
 * Delete an agent created by the factory.
 * Moves the directory to agents/_archive/, removes from registry.
 * SOP V26 — Maestro is SACRED, cannot be archived via factory.
 */
export function archiveAgent(agentId) {
    if (PROTECTED_AGENT_IDS.has(agentId)) {
        throw new Error(`Agent "${agentId}" is PROTECTED (SOP V26 — sacred agents). ` +
            `Cannot be archived via the factory.`);
    }
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
//# sourceMappingURL=agent_factory_v2.js.map