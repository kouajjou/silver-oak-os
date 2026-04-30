/**
 * Intent Classifier - Sprint 2 Pipeline V1 + Timeout Optimization
 * Detects if a message is a simple question or a technical task.
 *
 * V2 optimization (2026-04-29):
 * - Regex fast-path for obvious simple greetings (skip LLM entirely)
 * - 5s timeout wrapper with null fallback (was blocking for ~24s)
 * - Message hash cache (TTL 5min) to avoid repeated SDK calls
 *
 * archived: was using callLLM DeepSeek API (PAYANT zero-anthropic Phase F)
 * archived: was using claude-haiku-4-5 via SDK query() without timeout — 24s latency
 */
export type IntentType = 'simple_question' | 'technical_task' | 'unknown';
export interface IntentResult {
    intent: IntentType;
    confidence: number;
    reasoning: string;
    cost_usd: number;
}
export declare function classifyIntent(message: string): Promise<IntentResult>;
export default classifyIntent;
//# sourceMappingURL=intent_classifier.d.ts.map