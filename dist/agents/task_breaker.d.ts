/**
 * Task Breaker — Vision Alex Autonome
 * SOP V26 2026-05-02 CTO PhD : Cascade fallback automatique LLM providers
 *
 * Decomposes file content or a request into executable tasks with agent routing.
 * Uses cascade : DeepSeek → Google Gemini → Grok → OpenAI → Mistral
 * Anthropic banni hardcoded (R1).
 *
 * Si erreur crédit/quota → fallback automatique au provider suivant
 * Si TOUS échouent → fallback vers une seule tâche (degradation gracieuse)
 */
import { type LLMProvider } from '../adapters/llm/index.js';
export type TaskType = 'technical' | 'marketing' | 'design' | 'finance' | 'data' | 'unknown';
export type AgentTarget = 'maestro' | 'sara' | 'leo' | 'marco' | 'nina' | 'sophie' | 'elena' | 'jules';
export type Priority = 'P0' | 'P1' | 'P2' | 'P3';
export interface BrokenDownTask {
    id: string;
    title: string;
    description: string;
    type: TaskType;
    agent_target: AgentTarget;
    dependencies: string[];
    estimated_effort_min: number;
    priority: Priority;
    rationale: string;
}
export interface BreakdownResult {
    tasks: BrokenDownTask[];
    cost_usd: number;
    latency_ms: number;
    provider_used?: LLMProvider | null;
}
export declare function breakDownTasks(file_content: string, user_id: string): Promise<BreakdownResult>;
//# sourceMappingURL=task_breaker.d.ts.map