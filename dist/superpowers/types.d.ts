/**
 * SuperPowers Wrapper — Sprint 2 V2 Phase 1
 * Interfaces for giving SuperPowers to API adapters.
 */
import type { LLMRequest, LLMResponse } from '../adapters/llm/types.js';
export type SlashCommand = 'ultrathink' | 'riper' | 'fix-bug' | 'security-audit';
export type SubagentRole = 'frontend-ui' | 'api-backend' | 'db-supabase' | 'security-review';
export interface ToolDefinition {
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
    handler: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
}
export interface SuperPowersRequest extends LLMRequest {
    slash_command?: SlashCommand;
    subagent?: SubagentRole;
    tools?: string[];
    max_iterations?: number;
}
export interface SuperPowersResponse extends LLMResponse {
    tool_calls_executed: Array<{
        name: string;
        input: Record<string, unknown>;
        output: Record<string, unknown>;
    }>;
    iterations: number;
    superpowers_active: string[];
}
export interface ToolRegistry {
    [toolName: string]: ToolDefinition;
}
//# sourceMappingURL=types.d.ts.map