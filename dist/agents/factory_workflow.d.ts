/**
 * Factory Workflow — SaaS Launch Orchestrator
 *
 * Input: "lance un SaaS pour [idée]"
 * 12 steps: validation → marché → PRD → code → landing → RGPD → Stripe →
 *           launch → outreach → métriques → MRR → live
 *
 * - Persists to saas_projects table (requires 20260502_saas_projects.sql migration)
 * - Creates 4 MD files per SaaS in saas/<saas-id>/
 * - Sends HITL Telegram at each stage transition
 * - TEST_MODE: skips external actions (Stripe, PH, outreach)
 */
export type SaasStatus = 'idea' | 'validating' | 'building' | 'live';
export interface SaasProject {
    id: string;
    name: string;
    status: SaasStatus;
    mrr: number;
    users: number;
    decisions: unknown[];
    backlog: unknown[];
    metrics: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}
export interface FactoryWorkflowInput {
    idea: string;
    userId: string;
    testMode?: boolean;
}
export interface FactoryWorkflowResult {
    success: boolean;
    saasId: string;
    saasName: string;
    stepsCompleted: number;
    totalSteps: number;
    stepResults: StepResult[];
    blocked?: string;
    error?: string;
}
interface StepResult {
    step: number;
    name: string;
    status: 'completed' | 'skipped' | 'failed' | 'awaiting_hitl';
    output?: string;
    error?: string;
    durationMs: number;
}
export declare function runFactoryWorkflow(input: FactoryWorkflowInput): Promise<FactoryWorkflowResult>;
export declare function isFactoryRequest(message: string): boolean;
export {};
//# sourceMappingURL=factory_workflow.d.ts.map