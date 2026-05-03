/**
 * SoulPrompt Builder — Sprint 2
 *
 * Assembles a complete CLAUDE.md from the soul-prompts/ library.
 * All agents created by agent_factory_v2 use this to get a trilingual
 * CLAUDE.md with consistent personality traits and shared blocks.
 */
import fs from 'fs';
import path from 'path';
import { logger } from '../logger.js';
const DEFAULT_SHARED_BLOCKS = ['boundary', 'hive_mind', 'memory', 'delegation_policy', 'message_format'];
const SOUL_PROMPTS_DIR = path.join(process.cwd(), 'soul-prompts');
// ── File readers ──────────────────────────────────────────────────────────
function readBlock(filePath) {
    if (!fs.existsSync(filePath))
        return '';
    try {
        return fs.readFileSync(filePath, 'utf-8').trim();
    }
    catch {
        return '';
    }
}
function readTrait(traitName) {
    const filePath = path.join(SOUL_PROMPTS_DIR, 'traits', `${traitName}.md`);
    return readBlock(filePath);
}
function readLanguageBlock(lang) {
    const filePath = path.join(SOUL_PROMPTS_DIR, 'languages', `${lang}.md`);
    return readBlock(filePath);
}
function readRoleBlock(role) {
    const filePath = path.join(SOUL_PROMPTS_DIR, 'roles', `${role}.md`);
    return readBlock(filePath);
}
function readSharedBlock(blockName) {
    const filePath = path.join(SOUL_PROMPTS_DIR, 'shared', `${blockName}.md`);
    return readBlock(filePath);
}
// ── Language label helpers ────────────────────────────────────────────────
function getLangLabel(lang) {
    const labels = { fr: 'Français', en: 'English', es: 'Español' };
    return labels[lang] ?? lang.toUpperCase();
}
// ── Main builder ──────────────────────────────────────────────────────────
/**
 * Assemble a complete CLAUDE.md string from the soul-prompts library.
 * All sections come from flat files — no LLM calls required.
 */
export function buildSoulPrompt(spec) {
    const { agentId, agentName, agentDescription, role, traits, languages, customMission, delegationRules, sharedBlocks = DEFAULT_SHARED_BLOCKS, } = spec;
    const sections = [];
    // ── 1. Header / Identity ──────────────────────────────────────────────
    sections.push(`# Identity

You are **${agentName}**, ${agentDescription}.

- System role identifier: \`${agentId}\`
- Can be called: "${agentName}" or "${agentId}" — both work
- Role: ${role}
`);
    // ── 2. Custom mission (if provided) ───────────────────────────────────
    if (customMission) {
        sections.push(`# Mission

${customMission}
`);
    }
    // ── 3. Role block ──────────────────────────────────────────────────────
    const roleContent = readRoleBlock(role);
    if (roleContent) {
        sections.push(roleContent + '\n');
    }
    // ── 4. Traits (per language) ───────────────────────────────────────────
    if (traits.length > 0) {
        sections.push('# Personality Traits\n');
        for (const trait of traits) {
            const traitContent = readTrait(trait);
            if (traitContent) {
                sections.push(traitContent + '\n');
            }
            else {
                logger.warn(`soul_prompt_builder.trait_not_found trait=${trait} agent=${agentId}`);
            }
        }
    }
    // ── 5. Language blocks ─────────────────────────────────────────────────
    if (languages.length > 0) {
        sections.push('# Language Support\n');
        for (const lang of languages) {
            const langContent = readLanguageBlock(lang);
            if (langContent) {
                sections.push(`## ${getLangLabel(lang)}\n\n${langContent}\n`);
            }
        }
    }
    // ── 6. Shared infrastructure blocks ───────────────────────────────────
    if (sharedBlocks.length > 0) {
        sections.push('# Infrastructure\n');
        for (const blockName of sharedBlocks) {
            const blockContent = readSharedBlock(blockName);
            if (blockContent) {
                sections.push(blockContent + '\n');
            }
        }
    }
    // ── 7. Custom delegation rules ─────────────────────────────────────────
    if (delegationRules) {
        sections.push(`# Delegation Rules\n\n${delegationRules}\n`);
    }
    const result = sections.join('\n---\n\n');
    logger.info(`soul_prompt_builder.built agentId=${agentId} traits=${traits.length} langs=${languages.length} blocks=${sharedBlocks.length} chars=${result.length}`);
    return result;
}
/**
 * List available traits, languages, roles, and shared blocks from the library.
 */
export function getSoulPromptsInventory() {
    const listDir = (subdir) => {
        const dir = path.join(SOUL_PROMPTS_DIR, subdir);
        if (!fs.existsSync(dir))
            return [];
        try {
            return fs.readdirSync(dir)
                .filter(f => f.endsWith('.md') && f !== 'README.md')
                .map(f => f.replace('.md', ''));
        }
        catch {
            return [];
        }
    };
    return {
        traits: listDir('traits'),
        languages: listDir('languages'),
        roles: listDir('roles'),
        sharedBlocks: listDir('shared'),
    };
}
//# sourceMappingURL=soul_prompt_builder.js.map