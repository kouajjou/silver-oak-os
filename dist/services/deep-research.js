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
import { callLLM } from '../adapters/llm/index.js';
import { logger } from '../logger.js';
export class DeepResearchError extends Error {
    cause;
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'DeepResearchError';
    }
}
const GROK_PRIMARY = 'grok-4-fast-reasoning';
const GROK_FALLBACK = 'grok-3-fast';
// PhD fix 2026-05-01: gemini-2.5-pro = $1.25/M input vs flash $0.075/M = 16x plus cher
// Flash suffit largement pour la deep research
const GEMINI_PRIMARY = 'gemini-2.5-flash';
// gemini-2.0-flash deprecated June 1 2026 -> use 2.5-flash-lite (same price, future-proof)
const GEMINI_FALLBACK = 'gemini-2.5-flash-lite';
// Synthesis: cheaper Flash-Lite is sufficient for consolidation, and distinguishes from primary
const SYNTHESIS_MODEL = 'gemini-2.5-flash-lite';
const AGENT_ID = 'research';
const SYNTHESIS_PROMPT = `Tu es un assistant de synthèse pour un système de recherche multi-sources.

Voici 2 recherches (ou 1 si une source a échoué) sur le même sujet, faites par des sources différentes.

Synthétise en français en gardant uniquement les faits vérifiés. Si les sources sont en désaccord sur un point, signale-le explicitement (ex: "Source A dit X, Source B dit Y").

Format de sortie: Markdown clair, max 500 mots.`;
/**
 * Call a provider with primary model, fallback to secondary on failure.
 * Returns null if both fail (non-blocking — caller decides).
 */
async function callWithFallback(provider, primaryModel, fallbackModel, query) {
    const messages = [
        { role: 'system', content: 'Tu es un chercheur. Réponds avec des faits vérifiables, des sources si possible, et une date de fraîcheur.' },
        { role: 'user', content: query },
    ];
    try {
        const res = await callLLM({
            provider,
            model: primaryModel,
            messages,
            max_tokens: 2048,
            temperature: 0.3,
            agent_id: AGENT_ID,
        });
        return { content: res.content, model: res.model, latency_ms: res.latency_ms, cost_usd: res.cost_usd };
    }
    catch (errPrimary) {
        logger.warn({ provider, primaryModel, err: errPrimary }, 'deep-research: primary model failed, trying fallback');
        try {
            const res = await callLLM({
                provider,
                model: fallbackModel,
                messages,
                max_tokens: 2048,
                temperature: 0.3,
                agent_id: AGENT_ID,
            });
            return { content: res.content, model: res.model, latency_ms: res.latency_ms, cost_usd: res.cost_usd };
        }
        catch (errFallback) {
            logger.error({ provider, primaryModel, fallbackModel, err: errFallback }, 'deep-research: both primary and fallback failed');
            return null;
        }
    }
}
/**
 * Run a deep research query: 2 sources in parallel + Gemini Flash consolidation.
 *
 * @throws DeepResearchError if both Grok and Gemini fail.
 */
export async function deepResearch(query) {
    if (!query || query.trim().length === 0) {
        throw new DeepResearchError('Query cannot be empty');
    }
    const startTotal = Date.now();
    logger.info({ query, agent_id: AGENT_ID }, 'deep-research: starting');
    // Parallel calls — Promise.all is fine since callWithFallback never throws (returns null)
    const [grokRaw, geminiRaw] = await Promise.all([
        callWithFallback('xai', GROK_PRIMARY, GROK_FALLBACK, query),
        callWithFallback('google', GEMINI_PRIMARY, GEMINI_FALLBACK, query),
    ]);
    const sources = [];
    if (grokRaw) {
        sources.push({ provider: 'grok', model: grokRaw.model, content: grokRaw.content, latency_ms: grokRaw.latency_ms, cost_usd: grokRaw.cost_usd });
    }
    if (geminiRaw) {
        sources.push({ provider: 'gemini', model: geminiRaw.model, content: geminiRaw.content, latency_ms: geminiRaw.latency_ms, cost_usd: geminiRaw.cost_usd });
    }
    if (sources.length === 0) {
        throw new DeepResearchError('Both Grok and Gemini failed — no usable research source');
    }
    // Consolidation
    const sourcesText = sources
        .map((s, i) => `### Source ${i + 1} — ${s.provider} (${s.model})\n\n${s.content}`)
        .join('\n\n---\n\n');
    let synthesis;
    let synthesisCost = 0;
    let synthesisLatency = 0;
    try {
        const synth = await callLLM({
            provider: 'google',
            model: SYNTHESIS_MODEL,
            messages: [
                { role: 'system', content: SYNTHESIS_PROMPT },
                { role: 'user', content: `Question initiale: "${query}"\n\nRecherches:\n\n${sourcesText}` },
            ],
            max_tokens: 1024,
            temperature: 0.2,
            agent_id: AGENT_ID,
        });
        synthesis = synth.content;
        synthesisCost = synth.cost_usd;
        synthesisLatency = synth.latency_ms;
    }
    catch (err) {
        logger.warn({ err }, 'deep-research: synthesis failed, returning raw sources');
        synthesis = `⚠️ Consolidation Gemini Flash a échoué. Sources brutes ci-dessous:\n\n${sourcesText}`;
    }
    const totalCost = sources.reduce((acc, s) => acc + s.cost_usd, 0) + synthesisCost;
    const totalLatency = Date.now() - startTotal;
    logger.info({
        query,
        sources_count: sources.length,
        total_cost_usd: totalCost,
        total_latency_ms: totalLatency,
        synthesis_latency_ms: synthesisLatency,
        agent_id: AGENT_ID,
    }, 'deep-research: complete');
    return {
        query,
        sources,
        synthesis,
        total_cost_usd: totalCost,
        total_latency_ms: totalLatency,
        ts: Date.now(),
    };
}
//# sourceMappingURL=deep-research.js.map