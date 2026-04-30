export interface AgentTemplate {
    id: string;
    name: string;
    description: string;
}
export interface BotInfo {
    id: number;
    is_bot: boolean;
    first_name: string;
    username: string;
}
export interface CreateAgentOpts {
    id: string;
    name: string;
    description: string;
    model?: string;
    template?: string;
    botToken: string;
}
export interface CreateAgentResult {
    agentId: string;
    agentDir: string;
    envKey: string;
    plistPath: string | null;
    botInfo: BotInfo;
}
export declare function validateAgentId(id: string): {
    ok: boolean;
    error?: string;
};
export declare function validateBotToken(token: string): Promise<{
    ok: boolean;
    botInfo?: BotInfo;
    error?: string;
}>;
export declare function listTemplates(): AgentTemplate[];
export declare function createAgent(opts: CreateAgentOpts): Promise<CreateAgentResult>;
export interface ActivationResult {
    ok: boolean;
    error?: string;
    pid?: number;
}
export declare function activateAgent(agentId: string): ActivationResult;
export declare function deactivateAgent(agentId: string): {
    ok: boolean;
    error?: string;
};
export declare function deleteAgent(agentId: string): {
    ok: boolean;
    error?: string;
};
/** Suggest a bot display name and username based on agent ID. */
export declare function suggestBotNames(agentId: string): {
    displayName: string;
    username: string;
};
/** Pick a color for a new agent (avoids colors already used by existing agents). */
export declare function pickAgentColor(existingCount: number): string;
/** Check if an agent process is currently running. */
/**
 * Restart an agent by deactivating then reactivating its service.
 * Works on both macOS (launchd) and Linux (systemd).
 */
export declare function restartAgent(agentId: string): {
    ok: boolean;
    error?: string;
};
export declare function isAgentRunning(agentId: string): boolean;
//# sourceMappingURL=agent-create.d.ts.map