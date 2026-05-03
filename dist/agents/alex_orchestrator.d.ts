/**
 * Alex Orchestrator — Sprint 2 Pipeline V1 + Vision Alex Autonome
 * Chief of Staff. Receives Karim messages, classifies intent,
 * answers directly (simple) or delegates to Maestro (technical).
 *
 * V2 extensions (Vision Item #4):
 * - alexHandleAutonomous(): autonomous loop + delegation to 5 employees
 * - task_breaker for file content decomposition
 * - llm_judge for quality evaluation (Gemini cross-LLM, SOP R14)
 * - session_state for DB persistence (agent_runs + agent_run_tasks)
 * - Telegram progress updates every 5 tasks
 *
 * V3 extensions (Phase 5B.3):
 * - maestroHandle() wired for tech task delegation (orchestrator pattern)
 * - graceful fallback to dispatchToMaestro if maestroHandle throws
 *
 * V4 extensions (Phase 5B.4):
 * - delegateToAgent() wired for Sara/Leo/Marco/Nina (real CLAUDE.md + MCPs + memory)
 * - Replaces hardcoded dispatchToEmployee() with dynamic orchestrator delegation
 * - Extends intent classifier to 6 classes: comms/content/ops/research/technical/main
 */
export interface AlexRequest {
    message: string;
    user_id: string;
    agent_id?: string;
}
export interface AlexResponse {
    success: boolean;
    response: string;
    intent: string;
    delegated_to_maestro: boolean;
    cost_usd: number;
    latency_ms: number;
    metadata?: Record<string, unknown>;
}
export interface AlexAutonomousRequest extends AlexRequest {
    file_content?: string;
}
export interface AlexAutonomousResponse extends AlexResponse {
    run_id?: string;
}
type DomainIntent = 'comms_task' | 'content_task' | 'ops_task' | 'research_task' | 'maestro_task' | 'sophie_task' | 'elena_task' | 'jules_task';
export declare function classifyDomainRouteRegex(message: string): {
    intent: DomainIntent;
    agentId: string;
} | null;
export declare function classifyDomainRoute(message: string): Promise<{
    intent: DomainIntent;
    agentId: string;
} | null>;
export declare function alexHandle(request: AlexRequest): Promise<AlexResponse>;
export declare function alexHandleAutonomous(request: AlexAutonomousRequest): Promise<AlexAutonomousResponse>;
export default alexHandle;
//# sourceMappingURL=alex_orchestrator.d.ts.map