/**
 * Session State - Vision Alex Autonome
 * Persists agent runs in Supabase agent_runs + agent_run_tasks tables.
 * Allows Alex to resume after crash, track progress, manage multi-turn.
 */
export type RunStatus = 'running' | 'completed' | 'failed' | 'paused';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export interface AgentRun {
    id?: string;
    user_id: string;
    initial_request: string;
    initial_file_content?: string;
    status: RunStatus;
    tasks_total?: number;
    tasks_completed?: number;
    tasks_failed?: number;
    tasks_pending?: number;
    current_iteration?: number;
    max_iterations?: number;
    total_cost_usd?: number;
    total_latency_ms?: number;
    metadata?: Record<string, unknown>;
    started_at?: string;
    updated_at?: string;
    ended_at?: string | null;
}
export interface AgentRunTask {
    id?: string;
    run_id: string;
    task_id: string;
    title: string;
    task_type?: string;
    agent_target?: string;
    status: TaskStatus;
    result?: string;
    cost_usd?: number;
    latency_ms?: number;
    started_at?: string | null;
    ended_at?: string | null;
    created_at?: string;
}
export declare function createRun(run: Omit<AgentRun, 'id'>): Promise<AgentRun | null>;
export declare function updateRun(id: string, updates: Partial<AgentRun>): Promise<boolean>;
export declare function getRun(id: string): Promise<AgentRun | null>;
export declare function getActiveRuns(user_id: string): Promise<AgentRun[]>;
export declare function endRun(id: string, status: Exclude<RunStatus, 'running' | 'paused'>): Promise<boolean>;
export declare function createTask(task: Omit<AgentRunTask, 'id'>): Promise<AgentRunTask | null>;
export declare function updateTask(id: string, updates: Partial<AgentRunTask>): Promise<boolean>;
export declare function getTasksForRun(run_id: string): Promise<AgentRunTask[]>;
declare const _default: {
    createRun: typeof createRun;
    updateRun: typeof updateRun;
    getRun: typeof getRun;
    getActiveRuns: typeof getActiveRuns;
    endRun: typeof endRun;
    createTask: typeof createTask;
    updateTask: typeof updateTask;
    getTasksForRun: typeof getTasksForRun;
};
export default _default;
//# sourceMappingURL=session_state.d.ts.map