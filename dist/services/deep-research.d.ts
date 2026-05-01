/**
 * Deep Research Service — SOP V26 R7 (2 sources + 1 consolidation)
 *
 * Replaces Perplexity (deprecated, no quota) with Grok + Gemini in parallel.
 *
 * Pattern:
 *   Query
 *     ├── Grok grok-4-fast-reasoning  (real-time, news, X/Twitter)
 *     └── Gemini gemini-2.5-pro       (Google Search grounding)
 *     ↓
 *   Consolidation: Gemini Flash (cheap synthesis)
 *     ↓
 *   ResearchReport
 *
 * Used by: agents/research/ (Nina) for any web/competitive research.
 */
export interface ResearchSource {
    provider: 'grok' | 'gemini';
    model: string;
    content: string;
    latency_ms: number;
    cost_usd: number;
}
export interface ResearchReport {
    query: string;
    sources: ResearchSource[];
    synthesis: string;
    total_cost_usd: number;
    total_latency_ms: number;
    ts: number;
}
export declare class DeepResearchError extends Error {
    readonly cause?: unknown | undefined;
    constructor(message: string, cause?: unknown | undefined);
}
/**
 * Run a deep research query: 2 sources in parallel + Gemini Flash consolidation.
 *
 * @throws DeepResearchError if both Grok and Gemini fail.
 */
export declare function deepResearch(query: string): Promise<ResearchReport>;
//# sourceMappingURL=deep-research.d.ts.map