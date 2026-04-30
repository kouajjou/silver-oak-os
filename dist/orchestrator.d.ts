import { UsageInfo } from './agent.js';
export interface DelegationResult {
    agentId: string;
    text: string | null;
    usage: UsageInfo | null;
    taskId: string;
    durationMs: number;
}
export interface AgentInfo {
    id: string;
    name: string;
    description: string;
}
/**
 * Initialize the orchestrator by scanning `agents/` for valid configs.
 * Safe to call even if no agents are configured — the registry will be empty.
 */
export declare function initOrchestrator(): void;
/** Return all agents that were successfully loaded. */
export declare function getAvailableAgents(): AgentInfo[];
/**
 * Parse a user message for delegation syntax.
 *
 * Supported forms:
 *   @agentId: prompt text
 *   @agentId prompt text   (only if agentId is a known agent)
 *   /delegate agentId prompt text
 *
 * Returns `{ agentId, prompt }` or `null` if no delegation detected.
 */
export declare function parseDelegation(message: string): {
    agentId: string;
    prompt: string;
} | null;
/**
 * Delegate a task to another agent. Runs the agent's Claude Code session
 * in-process (same Node.js process) with the target agent's cwd and
 * system prompt.
 *
 * The delegation is logged to both `inter_agent_tasks` and `hive_mind`.
 *
 * @param agentId    Target agent identifier (must exist in agents/)
 * @param prompt     The task to delegate
 * @param chatId     Telegram chat ID (for DB tracking)
 * @param fromAgent  The requesting agent's ID (usually 'main')
 * @param onProgress Optional callback for status updates
 * @param timeoutMs  Maximum execution time (default 5 min)
 */
export declare function delegateToAgent(agentId: string, prompt: string, chatId: string, fromAgent: string, onProgress?: (msg: string) => void, timeoutMs?: number): Promise<DelegationResult>;
//# sourceMappingURL=orchestrator.d.ts.map