/**
 * Maestro Orchestrator -- Senior PhD Developer Agent
 * Receives technical tasks from Alex, dispatches to Mode 1 (tmux Pro Max) or Mode 2 (API).
 * Symmetric to alex_orchestrator.ts but for development tasks.
 * Phase 5B.2 -- Created 2026-04-29
 */
export interface MaestroOrchestratorContext {
    parentTaskId?: string;
    userId?: string;
    budgetUSD?: number;
    forceMode?: 'mode_1_tmux' | 'mode_2_api';
    preferredProvider?: 'deepseek' | 'gemini' | 'openai' | 'grok' | 'mistral';
}
export interface MaestroOrchestratorResult {
    success: boolean;
    result: string;
    mode: string;
    provider?: string | null;
    durationMs: number;
    judgeScore?: number;
    reasoning?: string;
    taskId: string;
    subtasks?: string[];
}
export declare function maestroHandle(task: string, context?: MaestroOrchestratorContext): Promise<MaestroOrchestratorResult>;
export default maestroHandle;
//# sourceMappingURL=maestro_orchestrator.d.ts.map