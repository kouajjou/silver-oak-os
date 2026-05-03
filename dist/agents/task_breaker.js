/**
 * Task Breaker — Vision Alex Autonome
 * SOP V26 2026-05-02 CTO PhD : Cascade fallback automatique LLM providers
 *
 * Decomposes file content or a request into executable tasks with agent routing.
 * Uses cascade : DeepSeek → Google Gemini → Grok → OpenAI → Mistral
 * Anthropic banni hardcoded (R1).
 *
 * Si erreur crédit/quota → fallback automatique au provider suivant
 * Si TOUS échouent → fallback vers une seule tâche (degradation gracieuse)
 */
import { callLLM } from '../adapters/llm/index.js';
import { logger } from '../logger.js';
const SYSTEM_PROMPT_BREAKER = `You are a task decomposer for Silver Oak OS multi-agent system.
Given a document or request, extract a list of concrete, executable tasks.

Agents available:
- maestro: technical tasks (code, infra, APIs, TypeScript, databases, deploy, debug)
- sara: communication tasks (email drafts, Gmail, inbox, outreach, replies)
- leo: content tasks (LinkedIn posts, YouTube scripts, blog, newsletter, copy)
- marco: ops & finance tasks (calendar, MRR, P&L, invoices, infra, padel)
- nina: research tasks (market research, competitor watch, IDP analysis, intel)
- sophie: product tasks (PRD, JTBD, RICE, lean canvas, idea validation, UX specs)
- elena: sales tasks (cold outreach, Product Hunt launch, GTM, Stripe setup, sequences)
- jules: legal tasks (CGV, GDPR/RGPD, DPA, privacy policy, AI Act, compliance audits)

Respond ONLY with valid JSON array (no markdown fences):
[
  {
    "id": "task_001",
    "title": "Short title",
    "description": "Clear description of what to do",
    "type": "technical|marketing|design|finance|data|unknown",
    "agent_target": "maestro|sara|leo|marco|nina|sophie|elena|jules",
    "dependencies": [],
    "estimated_effort_min": 30,
    "priority": "P0|P1|P2|P3",
    "rationale": "Why this agent for this task"
  }
]

Max 10 tasks. Be precise and actionable.`;
// SOP V26 R-cascade : Cascade fallback order (Anthropic banni R1)
// Aligné avec maestro_dispatcher.ts pour cohérence
const FALLBACK_ORDER = [
    'deepseek',
    'google',
    'xai',
    'openai',
    'mistral',
];
const PROVIDER_TO_MODEL = {
    deepseek: 'deepseek-chat',
    google: 'gemini-2.5-flash',
    xai: 'grok-2-1212',
    openai: 'gpt-4o-mini',
    mistral: 'mistral-small-latest',
};
/**
 * Détermine si l'erreur justifie un fallback (crédit/quota/auth).
 * Aligné avec maestro_dispatcher.shouldFallback().
 */
function shouldFallback(errorMsg) {
    const triggers = [
        'insufficient balance',
        'quota exceeded',
        'rate limit',
        'rate_limit',
        'credit',
        'billing',
        'payment',
        'unauthorized',
        '401',
        '402',
        '429',
        'no api key',
        'invalid api key',
    ];
    const lower = errorMsg.toLowerCase();
    return triggers.some((t) => lower.includes(t));
}
/**
 * Tente un appel LLM sur UN provider. Retourne null si succès, sinon l'erreur.
 */
async function tryDecomposeWithProvider(provider, file_content, user_id) {
    const model = PROVIDER_TO_MODEL[provider] ?? 'deepseek-chat';
    try {
        const response = await callLLM({
            provider,
            model,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT_BREAKER },
                { role: 'user', content: `Decompose into tasks:\n\n${file_content.slice(0, 4000)}` },
            ],
            max_tokens: 2000,
            agent_id: `task_breaker_${user_id}`,
        });
        const clean = response.content.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        if (!Array.isArray(parsed)) {
            return { error: 'task_breaker: LLM did not return an array' };
        }
        const tasks = parsed.map((t, i) => ({
            id: typeof t['id'] === 'string' ? t['id'] : `task_${String(i + 1).padStart(3, '0')}`,
            title: typeof t['title'] === 'string' ? t['title'] : `Task ${i + 1}`,
            description: typeof t['description'] === 'string' ? t['description'] : '',
            type: (typeof t['type'] === 'string' ? t['type'] : 'unknown'),
            agent_target: (typeof t['agent_target'] === 'string' ? t['agent_target'] : 'maestro'),
            dependencies: Array.isArray(t['dependencies']) ? t['dependencies'] : [],
            estimated_effort_min: typeof t['estimated_effort_min'] === 'number' ? t['estimated_effort_min'] : 30,
            priority: (typeof t['priority'] === 'string' ? t['priority'] : 'P2'),
            rationale: typeof t['rationale'] === 'string' ? t['rationale'] : '',
        }));
        return { tasks, cost_usd: response.cost_usd };
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { error: msg };
    }
}
export async function breakDownTasks(file_content, user_id) {
    const start = Date.now();
    logger.info({ user: user_id, len: file_content.length }, 'task_breaker.start');
    let lastError = 'unknown';
    let usedProvider = null;
    // Cascade : essaie chaque provider jusqu'à ce qu'un succès arrive
    for (let i = 0; i < FALLBACK_ORDER.length; i++) {
        const provider = FALLBACK_ORDER[i];
        logger.info({ provider, attempt: i + 1, total: FALLBACK_ORDER.length }, 'task_breaker.try_provider');
        const result = await tryDecomposeWithProvider(provider, file_content, user_id);
        // Succès
        if ('tasks' in result) {
            usedProvider = provider;
            logger.info({
                provider,
                count: result.tasks.length,
                cost: result.cost_usd,
                cascade_position: i,
                latency_ms: Date.now() - start,
            }, 'task_breaker.success');
            return {
                tasks: result.tasks,
                cost_usd: result.cost_usd,
                latency_ms: Date.now() - start,
                provider_used: provider,
            };
        }
        // Échec : décide cascade ou stop
        lastError = result.error;
        if (shouldFallback(lastError) && i < FALLBACK_ORDER.length - 1) {
            const next = FALLBACK_ORDER[i + 1];
            logger.warn({ provider, error: lastError, next }, 'task_breaker.cascade.fallback_next');
            continue;
        }
        // Erreur non liée crédit/quota → STOP cascade
        if (!shouldFallback(lastError)) {
            logger.warn({ provider, error: lastError }, 'task_breaker.cascade.stop_non_credit_error');
            break;
        }
    }
    // Tous les providers ont échoué → fallback gracieux
    logger.error({ lastError, providers_tried: FALLBACK_ORDER }, 'task_breaker.cascade.all_failed_using_fallback_single_task');
    return {
        tasks: [{
                id: 'task_001',
                title: 'Direct request',
                description: file_content.slice(0, 500),
                type: 'unknown',
                agent_target: 'maestro',
                dependencies: [],
                estimated_effort_min: 30,
                priority: 'P1',
                rationale: 'Fallback — task_breaker cascade all providers failed',
            }],
        cost_usd: 0,
        latency_ms: Date.now() - start,
        provider_used: usedProvider,
    };
}
//# sourceMappingURL=task_breaker.js.map