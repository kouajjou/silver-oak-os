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
    /**
     * Sprint 4 (Maestro Auto-Wiring, Option C):
     * If true (default), the factory automatically injects a delegation rule:
     *   "Pour les tâches tech (code, deploy, audit, fix), tu peux déléguer directement à Maestro."
     * Set to false to opt-out (rare cases like another orchestrator agent).
     * Maestro himself ('id'='maestro') is automatically excluded.
     * Alex ('id'='main', role='orchestrator') is automatically excluded too.
     */
    auto_delegate_to_maestro?: boolean;
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
    /** True if the Maestro auto-delegation block was injected. */
    maestroAutoDelegationInjected: boolean;
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
 * SOP V26 — Maestro is SACRED, cannot be archived via factory.
 */
export declare function archiveAgent(agentId: string): void;
//# sourceMappingURL=agent_factory_v2.d.ts.map