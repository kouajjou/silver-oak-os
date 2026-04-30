/**
 * Agent to Claude Model mapping
 * Fix #2 V2 — All agents use SDK Claude Code Pro Max (/bin/bash forfait Karim)
 *
 * IMPORTANT: Never use @anthropic-ai/sdk (Anthropic API = PAYANT).
 * Always use @anthropic-ai/claude-agent-sdk (Pro Max OAuth forfait = /bin/bash).
 */
export type AgentName = 'alex' | 'sara' | 'leo' | 'marco' | 'nina' | 'maestro';
export type ClaudeModel = 'claude-haiku-4-5' | 'claude-sonnet-4-5' | 'claude-opus-4-5';
export declare const AGENT_MODELS: Record<AgentName, ClaudeModel>;
export declare function getModelForAgent(agent: AgentName): ClaudeModel;
export declare function getCriticalModel(): ClaudeModel;
//# sourceMappingURL=agent_models.d.ts.map