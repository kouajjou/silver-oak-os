export declare const DEFAULT_MAIN_DESCRIPTION = "Primary ClaudeClaw bot";
export interface AgentConfig {
    name: string;
    description: string;
    botTokenEnv?: string;
    botToken?: string;
    model?: string;
    mcpServers?: string[];
    obsidian?: {
        vault: string;
        folders: string[];
        readOnly?: string[];
    };
    /** Pika voice id used when this agent joins a video meeting. Falls back
     *  to the Pika preset English_radiant_girl if unset. */
    meetVoiceId?: string;
    /** Display name shown in the meeting ("Your Agent wants to join"). Falls
     *  back to the agent's name or id with first letter capitalized. */
    meetBotName?: string;
    /** Restrict which user-invocable skills this bot exposes as slash
     *  commands. When set, only these skill names appear in the Telegram
     *  menu and are dispatchable via /<name>. When absent, the bot sees
     *  every user_invocable skill under ~/.claude/skills/. */
    skillsAllowlist?: string[];
}
/**
 * Resolve the directory for a given agent, checking CLAUDECLAW_CONFIG first,
 * then falling back to PROJECT_ROOT/agents/<id>.
 */
export declare function resolveAgentDir(agentId: string): string;
/**
 * Resolve the CLAUDE.md path for a given agent, checking CLAUDECLAW_CONFIG first,
 * then falling back to PROJECT_ROOT/agents/<id>/CLAUDE.md.
 */
export declare function resolveAgentClaudeMd(agentId: string): string | null;
export declare function loadAgentConfig(agentId: string): AgentConfig;
/** Update the model field in an agent's agent.yaml file. */
export declare function setAgentModel(agentId: string, model: string): void;
/** Update the description field in an agent's agent.yaml file. */
export declare function setAgentDescription(agentId: string, description: string): void;
/** Load the description for the main bot (persisted, editable). */
export declare function getMainDescription(): string;
/** Persist a description for the main bot. */
export declare function setMainDescription(description: string): void;
/** List all configured agent IDs (directories under agents/ with agent.yaml).
 *  Scans both CLAUDECLAW_CONFIG/agents/ and PROJECT_ROOT/agents/, deduplicating.
 */
export declare function listAgentIds(): string[];
/** Return the capabilities (name + description) for a specific agent. */
export declare function getAgentCapabilities(agentId: string): {
    name: string;
    description: string;
} | null;
/**
 * List all configured agents with their descriptions.
 * Unlike `listAgentIds()`, this returns richer metadata and silently
 * skips agents whose config fails to load (e.g. missing token).
 */
export declare function listAllAgents(): Array<{
    id: string;
    name: string;
    description: string;
    model?: string;
}>;
//# sourceMappingURL=agent-config.d.ts.map