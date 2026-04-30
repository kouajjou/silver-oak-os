/**
 * Task Breaker — Vision Alex Autonome
 * Decomposes file content or a request into executable tasks with agent routing.
 * Uses DeepSeek (cost-effective) for task decomposition.
 */
export type TaskType = 'technical' | 'marketing' | 'design' | 'finance' | 'data' | 'unknown';
export type AgentTarget = 'maestro' | 'sara' | 'leo' | 'marco' | 'nina';
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
}
export declare function breakDownTasks(file_content: string, user_id: string): Promise<BreakdownResult>;
//# sourceMappingURL=task_breaker.d.ts.map