/**
 * LLM Judge - Vision Alex Autonome
 * Cross-LLM evaluator with Gemini (per SOP V26 R14 - avoid self-grading bias)
 * Decides: task completed? quality grade?
 */
export type CompletionGrade = 'A' | 'B' | 'C' | 'D' | 'F';
export interface JudgeResult {
    is_completed: boolean;
    grade: CompletionGrade;
    confidence: number;
    reasoning: string;
    missing_aspects: string[];
    recommendations: string[];
    cost_usd: number;
    latency_ms: number;
}
export interface JudgeRequest {
    task_description: string;
    expected_output: string;
    actual_output: string;
    task_type?: string;
}
export declare function judge(request: JudgeRequest): Promise<JudgeResult>;
export default judge;
//# sourceMappingURL=llm_judge.d.ts.map