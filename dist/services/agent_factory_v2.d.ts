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
export declare function refreshDomainRoutesCache(): void;
export declare function loadDomainRoutes(): Array<{
    agentId: string;
    keywords: string[];
    patterns: RegExp[];
}>;
export declare function createAgent(spec: CreateAgentSpec): Promise<CreateAgentResult>;
/**
 * Delete an agent created by the factory.
 * Moves the directory to agents/_archive/, removes from registry.
 */
export declare function archiveAgent(agentId: string): void;
//# sourceMappingURL=agent_factory_v2.d.ts.map