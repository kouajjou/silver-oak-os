export interface SkillMeta {
    id: string;
    name: string;
    description: string;
    triggerWords: string[];
    fullPath: string;
}
/**
 * Scan skills/ (relative to project root) and ~/.claude/skills/ to
 * populate the registry. Safe to call multiple times; clears previous state.
 */
export declare function initSkillRegistry(): void;
/**
 * Return a compact index of all skills, one line per skill.
 * Format: "skill_id: description"
 */
export declare function getSkillIndex(): string;
/**
 * Find skills whose trigger words appear in the message.
 */
export declare function matchSkills(message: string): SkillMeta[];
/**
 * Load the full SKILL.md content for a given skill ID.
 */
export declare function getSkillInstructions(id: string): string | null;
/**
 * Return all registered skills.
 */
export declare function getAllSkills(): SkillMeta[];
//# sourceMappingURL=skill-registry.d.ts.map