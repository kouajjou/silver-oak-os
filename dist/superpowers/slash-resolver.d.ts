/**
 * Slash Command Resolver — Sprint 2 V2 Phase 1
 * Maps slash commands to system prompt prefixes injected before LLM call.
 */
import type { SlashCommand } from './types.js';
/**
 * Return the system prompt prefix for a slash command, or empty string if none.
 */
export declare function resolveSlashCommand(slash: SlashCommand | undefined): string;
export default resolveSlashCommand;
//# sourceMappingURL=slash-resolver.d.ts.map