/**
 * Memory LLM Wrapper — Mistral primary + Gemini fallback
 *
 * Cost optimization (May 2026): Replaces direct gemini-2.5-flash calls in
 * memory-consolidate.ts and memory-ingest.ts. Mistral Small is ~10x cheaper
 * than Gemini 2.5 Flash for our memory workload (small JSON outputs).
 *
 * Pricing (per 1M tokens):
 *   - mistral-small-latest:  $0.20 input / $0.60 output (EU-sovereign, France)
 *   - gemini-2.5-flash-lite: $0.10 input / $0.40 output (fallback)
 *
 * Strategy:
 *   1. Try Mistral with strict JSON system prompt (mistral excels at JSON)
 *   2. On any failure (HTTP error, empty content, missing key) → Gemini Flash Lite
 *   3. If both fail → throw MemoryLLMError
 *
 * The wrapper goes through callLLM() to benefit from budget tracking
 * (agent_id='memory') and provider stats.
 */
export declare class MemoryLLMError extends Error {
    readonly cause?: unknown | undefined;
    constructor(message: string, cause?: unknown | undefined);
}
/**
 * Run a memory LLM call with Mistral primary + Gemini fallback.
 *
 * @param prompt   The instruction (e.g. CONSOLIDATION_PROMPT or EXTRACTION_PROMPT)
 * @param context  Optional dynamic data appended to the prompt (memories JSON, conversation, etc.)
 * @returns        The raw JSON-string response from the LLM. Caller must parse it.
 * @throws         MemoryLLMError if both Mistral and Gemini fail.
 */
export declare function callMemoryLLM(prompt: string, context?: string): Promise<string>;
//# sourceMappingURL=memory-llm.d.ts.map