import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { CLAUDECLAW_CONFIG, PROJECT_ROOT, STORE_DIR } from './config.js';
import { readEnvFile } from './env.js';
export const DEFAULT_MAIN_DESCRIPTION = 'Primary ClaudeClaw bot';
function mainConfigPath() {
    return path.join(STORE_DIR, 'main-config.json');
}
/**
 * Resolve the directory for a given agent, checking CLAUDECLAW_CONFIG first,
 * then falling back to PROJECT_ROOT/agents/<id>.
 */
export function resolveAgentDir(agentId) {
    const externalDir = path.join(CLAUDECLAW_CONFIG, 'agents', agentId);
    if (fs.existsSync(path.join(externalDir, 'agent.yaml'))) {
        return externalDir;
    }
    return path.join(PROJECT_ROOT, 'agents', agentId);
}
/**
 * Resolve the CLAUDE.md path for a given agent, checking CLAUDECLAW_CONFIG first,
 * then falling back to PROJECT_ROOT/agents/<id>/CLAUDE.md.
 */
export function resolveAgentClaudeMd(agentId) {
    const externalPath = path.join(CLAUDECLAW_CONFIG, 'agents', agentId, 'CLAUDE.md');
    if (fs.existsSync(externalPath)) {
        return externalPath;
    }
    const repoPath = path.join(PROJECT_ROOT, 'agents', agentId, 'CLAUDE.md');
    if (fs.existsSync(repoPath)) {
        return repoPath;
    }
    return null;
}
export function loadAgentConfig(agentId) {
    const agentDir = resolveAgentDir(agentId);
    const configPath = path.join(agentDir, 'agent.yaml');
    if (!fs.existsSync(configPath)) {
        throw new Error(`Agent config not found: ${configPath}`);
    }
    const raw = yaml.load(fs.readFileSync(configPath, 'utf-8'));
    const name = raw['name'];
    const description = raw['description'] ?? '';
    const botTokenEnv = raw['telegram_bot_token_env'];
    const model = raw['model'];
    if (!name) {
        throw new Error(`Agent config ${configPath} must have 'name'`);
    }
    // SOP V26 PROPER ORCHESTRATION : telegram_bot_token_env est OPTIONNEL.
    // Directeurs logiques (Sophie/Elena/Jules) appelés via delegateToAgent
    // n'ont pas besoin de bot Telegram dédié.
    let botToken = '';
    if (botTokenEnv) {
        const env = readEnvFile([botTokenEnv]);
        botToken = process.env[botTokenEnv] || env[botTokenEnv] || '';
        if (!botToken) {
            throw new Error(`Bot token not found: set ${botTokenEnv} in .env`);
        }
    }
    let obsidian;
    const obsRaw = raw['obsidian'];
    if (obsRaw) {
        const vault = obsRaw['vault'];
        if (vault && !fs.existsSync(vault)) {
            // eslint-disable-next-line no-console
            console.warn(`[${agentId}] WARNING: Obsidian vault path does not exist: ${vault}`);
            console.warn(`[${agentId}] Update obsidian.vault in agent.yaml to your local vault path.`);
        }
        obsidian = {
            vault,
            folders: obsRaw['folders'] ?? [],
            readOnly: obsRaw['read_only'] ?? [],
        };
    }
    const mcpServers = raw['mcp_servers'];
    const meetVoiceId = typeof raw['meet_voice_id'] === 'string' ? raw['meet_voice_id'] : undefined;
    const meetBotName = typeof raw['meet_bot_name'] === 'string' ? raw['meet_bot_name'] : undefined;
    const rawSkills = raw['skills_allowlist'];
    const skillsAllowlist = Array.isArray(rawSkills)
        ? rawSkills.filter((s) => typeof s === 'string').map((s) => s.toLowerCase())
        : undefined;
    return {
        name,
        description,
        botTokenEnv,
        botToken,
        model,
        mcpServers,
        obsidian,
        meetVoiceId,
        meetBotName,
        skillsAllowlist,
    };
}
/** Update the model field in an agent's agent.yaml file. */
export function setAgentModel(agentId, model) {
    const agentDir = resolveAgentDir(agentId);
    const configPath = path.join(agentDir, 'agent.yaml');
    if (!fs.existsSync(configPath))
        throw new Error(`Agent config not found: ${configPath}`);
    const raw = yaml.load(fs.readFileSync(configPath, 'utf-8'));
    raw['model'] = model;
    fs.writeFileSync(configPath, yaml.dump(raw, { lineWidth: -1 }), 'utf-8');
}
/** Update the description field in an agent's agent.yaml file. */
export function setAgentDescription(agentId, description) {
    const trimmed = description.trim();
    if (!trimmed)
        throw new Error('description cannot be empty');
    const agentDir = resolveAgentDir(agentId);
    const configPath = path.join(agentDir, 'agent.yaml');
    if (!fs.existsSync(configPath))
        throw new Error(`Agent config not found: ${configPath}`);
    const raw = yaml.load(fs.readFileSync(configPath, 'utf-8'));
    raw['description'] = trimmed;
    fs.writeFileSync(configPath, yaml.dump(raw, { lineWidth: -1 }), 'utf-8');
}
/** Load the description for the main bot (persisted, editable). */
export function getMainDescription() {
    const configPath = mainConfigPath();
    try {
        if (!fs.existsSync(configPath))
            return DEFAULT_MAIN_DESCRIPTION;
        const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const desc = (raw.description ?? '').trim();
        return desc || DEFAULT_MAIN_DESCRIPTION;
    }
    catch {
        return DEFAULT_MAIN_DESCRIPTION;
    }
}
/** Persist a description for the main bot. */
export function setMainDescription(description) {
    const trimmed = description.trim();
    if (!trimmed)
        throw new Error('description cannot be empty');
    if (!fs.existsSync(STORE_DIR))
        fs.mkdirSync(STORE_DIR, { recursive: true });
    const configPath = mainConfigPath();
    let raw = {};
    if (fs.existsSync(configPath)) {
        try {
            raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }
        catch {
            raw = {};
        }
    }
    raw['description'] = trimmed;
    fs.writeFileSync(configPath, JSON.stringify(raw, null, 2) + '\n', 'utf-8');
}
/** List all configured agent IDs (directories under agents/ with agent.yaml).
 *  Scans both CLAUDECLAW_CONFIG/agents/ and PROJECT_ROOT/agents/, deduplicating.
 */
export function listAgentIds() {
    const ids = new Set();
    for (const baseDir of [
        path.join(CLAUDECLAW_CONFIG, 'agents'),
        path.join(PROJECT_ROOT, 'agents'),
    ]) {
        if (!fs.existsSync(baseDir))
            continue;
        for (const d of fs.readdirSync(baseDir)) {
            if (d.startsWith('_'))
                continue;
            const yamlPath = path.join(baseDir, d, 'agent.yaml');
            if (fs.existsSync(yamlPath))
                ids.add(d);
        }
    }
    return [...ids];
}
/** Return the capabilities (name + description) for a specific agent. */
export function getAgentCapabilities(agentId) {
    try {
        const config = loadAgentConfig(agentId);
        return { name: config.name, description: config.description };
    }
    catch {
        return null;
    }
}
/**
 * List all configured agents with their descriptions.
 * Unlike `listAgentIds()`, this returns richer metadata and silently
 * skips agents whose config fails to load (e.g. missing token).
 */
export function listAllAgents() {
    const ids = listAgentIds();
    const result = [];
    for (const id of ids) {
        try {
            const config = loadAgentConfig(id);
            result.push({
                id,
                name: config.name,
                description: config.description,
                model: config.model,
            });
        }
        catch {
            // Skip agents with broken config
        }
    }
    return result;
}
//# sourceMappingURL=agent-config.js.map