/**
 * SoulPrompt Builder — Sprint 2
 *
 * Assembles a complete CLAUDE.md from the soul-prompts/ library.
 * All agents created by agent_factory_v2 use this to get a trilingual
 * CLAUDE.md with consistent personality traits and shared blocks.
 */
export interface SoulPromptSpec {
    agentId: string;
    agentName: string;
    agentDescription: string;
    role: 'orchestrator' | 'specialist' | 'workhorse';
    traits: string[];
    languages: ('fr' | 'en' | 'es')[];
    customMission?: string;
    delegationRules?: string;
    sharedBlocks?: string[];
}
/**
 * Assemble a complete CLAUDE.md string from the soul-prompts library.
 * All sections come from flat files — no LLM calls required.
 */
export declare function buildSoulPrompt(spec: SoulPromptSpec): string;
/**
 * List available traits, languages, roles, and shared blocks from the library.
 */
export declare function getSoulPromptsInventory(): {
    traits: string[];
    languages: string[];
    roles: string[];
    sharedBlocks: string[];
};
//# sourceMappingURL=soul_prompt_builder.d.ts.map