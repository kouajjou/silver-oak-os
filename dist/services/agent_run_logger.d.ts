/**
 * Agent Run Logger -- DB tracking for Alex/Maestro orchestration
 * Phase 5B.2 -- Created 2026-04-29
 */
export interface AgentRunLog {
    agent: 'alex' | 'maestro' | 'sara' | 'leo' | 'marco' | 'nina';
    taskId: string;
    task: string;
    mode: 'mode_1' | 'mode_2' | 'failed';
    provider?: string;
    success: boolean;
    judgeScore?: number;
    durationMs: number;
    error?: string;
    parentTaskId?: string;
}
export declare function logAgentRun(log: AgentRunLog): Promise<void>;
//# sourceMappingURL=agent_run_logger.d.ts.map