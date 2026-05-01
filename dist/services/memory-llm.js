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
import { callLLM, getProvidersStatus } from '../adapters/llm/index.js';
import { logger } from '../logger.js';
export class MemoryLLMError extends Error {
    cause;
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'MemoryLLMError';
    }
}
const MISTRAL_MODEL = 'mistral-small-latest';
const GEMINI_FALLBACK_MODEL = 'gemini-2.5-flash-lite';
const AGENT_ID = 'memory';
const MAX_TOKENS = 1000;
const TEMPERATURE = 0.1;
const SYSTEM_PROMPT = [
    'Tu es un assistant de mémoire IA spécialisé dans l\'extraction et la consolidation de souvenirs.',
    'Réponds UNIQUEMENT en JSON valide.',
    'Jamais de markdown, jamais de balises de code, jamais d\'explication avant ou après le JSON.',
    'Le tout premier caractère de ta réponse doit être { ou [.',
].join('\n');
function isMistralAvailable() {
    // Re-check at call-time in case .env was reloaded
    if (!process.env['MISTRAL_API_KEY'])
        return false;
    const status = getProvidersStatus();
    const m = status.find((s) => s.provider === 'mistral');
    return m?.available === true;
}
async function tryMistral(prompt, context) {
    if (!isMistralAvailable()) {
        logger.debug('[memory-llm] Mistral unavailable (no key) — skipping to Gemini fallback');
        return null;
    }
    try {
        const res = await callLLM({
            provider: 'mistral',
            model: MISTRAL_MODEL,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: prompt + context },
            ],
            max_tokens: MAX_TOKENS,
            temperature: TEMPERATURE,
            agent_id: AGENT_ID,
        });
        if (!res.content || res.content.trim().length === 0) {
            logger.warn({ model: MISTRAL_MODEL }, '[memory-llm] Mistral returned empty content — falling back');
            return null;
        }
        logger.info({ provider: 'mistral', model: res.model, cost_usd: res.cost_usd, latency_ms: res.latency_ms }, '[memory-llm] call');
        return res.content;
    }
    catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.warn({ err: errMsg }, '[memory-llm] Mistral failed — falling back to Gemini');
        return null;
    }
}
async function tryGeminiFallback(prompt, context) {
    try {
        const res = await callLLM({
            provider: 'google',
            model: GEMINI_FALLBACK_MODEL,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: prompt + context },
            ],
            max_tokens: MAX_TOKENS,
            temperature: TEMPERATURE,
            agent_id: AGENT_ID,
        });
        if (!res.content || res.content.trim().length === 0) {
            logger.error({ model: GEMINI_FALLBACK_MODEL }, '[memory-llm] Gemini fallback returned empty content');
            return null;
        }
        logger.info({ provider: 'gemini-fallback', model: res.model, cost_usd: res.cost_usd, latency_ms: res.latency_ms }, '[memory-llm] call');
        return res.content;
    }
    catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.error({ err: errMsg }, '[memory-llm] Gemini fallback also failed');
        return null;
    }
}
/**
 * Run a memory LLM call with Mistral primary + Gemini fallback.
 *
 * @param prompt   The instruction (e.g. CONSOLIDATION_PROMPT or EXTRACTION_PROMPT)
 * @param context  Optional dynamic data appended to the prompt (memories JSON, conversation, etc.)
 * @returns        The raw JSON-string response from the LLM. Caller must parse it.
 * @throws         MemoryLLMError if both Mistral and Gemini fail.
 */
export async function callMemoryLLM(prompt, context = '') {
    const start = Date.now();
    const mistralResult = await tryMistral(prompt, context);
    if (mistralResult)
        return mistralResult;
    const geminiResult = await tryGeminiFallback(prompt, context);
    if (geminiResult)
        return geminiResult;
    const totalLatency = Date.now() - start;
    throw new MemoryLLMError(`Both Mistral and Gemini fallback failed for memory call (latency ${totalLatency}ms)`);
}
//# sourceMappingURL=memory-llm.js.map