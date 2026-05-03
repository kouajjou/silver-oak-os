/**
 * Maestro Dispatcher — Sprint 2 Pipeline V1
 *
 * SOP V26 PROPER DISPATCH — 2 mai 2026 (v1.2 + cascade fallback)
 *
 * Mode 1 : CLI tmux via MCP Bridge (forfait Pro Max, $0 marginal)
 *   → 4 sessions Sonnet : claude-code, claude-backend, claude-frontend, opus (urgences only)
 *   → Routage automatique selon type de tâche
 *
 * Mode 2 : API LLM directe (5 providers concurrents, Anthropic banni R1)
 *   → DeepSeek → Gemini → Grok → OpenAI → Mistral (CASCADE FALLBACK AUTO)
 *   → Si TOUS échouent crédit/quota : fallback ULTIME Mode 1 tmux gratuit
 *
 * Mode 3 : Frontend Testing — claude-browser (Playwright + axe + Lighthouse)
 *   → Session tmux 'claude-browser' dédiée tests UI comme un humain
 *   → Cible : pages Next.js, dashboards, War Room, agents UI
 *   → Détection auto via keywords (test UI, screenshot, audit a11y, browse, etc.)
 *
 * SOP V26 Rules respected:
 *   R1 : Opus banni hardcodé — chooseSession() ne route à opus QUE si tâche critique
 *        ET USINE_OPUS_ALLOWED=true
 *   R47: Tier routing — Sonnet 4.6 (Mode 1) pour code, DeepSeek/Gemini (Mode 2) pour bash/audit
 *   R78: Cuisinier 1700€/h n'épluche pas — Maestro orchestre, workers exécutent
 *   R-cascade (NEW 2 mai 2026) : Plus jamais d'arrêt pour cause de crédit/quota
 */
import { callLLM, getAvailableProviders } from '../adapters/llm/index.js';
import { dispatchToTmuxSession } from '../services/cli_tmux_dispatcher.js';
import { logger } from '../logger.js';
import { logMaestroDispatch } from '../services/maestro-dispatch-log.js';
const SYSTEM_PROMPT_MAESTRO = `You are Maestro, CTO of Silver Oak OS (SOP V26, 78 rules).
You receive technical tasks from Alex (Chief of Staff) and produce an execution plan.

Key SOP V26 rules:
- /ultrathink before complex tasks
- Read files before any edit (R52)
- TypeScript compile clean before commit (0 errors)
- Tests: tsc + curl + regression (4 criteria) before TASK_DONE
- No pm2 restart all — pm2 reload <name> only
- Never delete — move to _archive/
- Telegram report at end of every task

Respond with:
1. ACTION_PLAN: numbered steps (max 5)
2. PROVIDER_RECOMMENDATION: best LLM for this task and why
3. EXPECTED_OUTPUT: what success looks like

Be concise. Max 300 tokens.`;
// ── SOP V26 CASCADE FALLBACK — Règle Karim 2 mai 2026 ──────────────────────────
//
// Quand un provider échoue pour cause de crédit/quota/rate-limit,
// le système essaie automatiquement le suivant. Plus jamais d'arrêt
// pour cause externe (compte vide, quota dépassé, rate limit temporaire).
//
// Ordre cascade : DeepSeek (cheap default) → Gemini (Google) → Grok (xAI)
//                 → OpenAI → Mistral → Mode 1 tmux Pro Max (ULTIME, $0).
const FALLBACK_ORDER = [
    'deepseek',
    'google',
    'xai',
    'openai',
    'mistral',
];
/**
 * Détecte si une erreur LLM justifie un fallback automatique vers le provider suivant.
 * Couvre : Insufficient Balance, quota, rate limit, billing, payment, 401/402/429.
 *
 * Si l'erreur N'EST PAS dans cette liste (ex : bug code, network), on STOPPE la cascade —
 * c'est un vrai bug à investiguer, pas un problème de crédit.
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
// ── Session selector — SOP V26 PROPER DISPATCH ────────────────────────────────
/**
 * Choisit la session tmux Mode 1 selon le contenu de la tâche.
 * Précédence (haut → bas) :
 *   1. preferred_session si fourni explicitement
 *   2. opus si is_critical=true ET USINE_OPUS_ALLOWED=true (R1)
 *   3. Architecture / review → claude-code
 *   4. Frontend (UI/React/Next) → claude-frontend
 *   5. Backend (API/migration/workflow) → claude-backend
 *   6. Fallback → claude-code (orchestration générique)
 */
export function chooseSession(task, hints = {}) {
    // 1. Hint explicite
    if (hints.preferred_session) {
        return hints.preferred_session;
    }
    // 2. R1 : opus uniquement pour critique + override env
    const opusAllowed = process.env['USINE_OPUS_ALLOWED'] === 'true';
    if (hints.is_critical && opusAllowed) {
        return 'opus';
    }
    const lower = task.toLowerCase();
    // 3. Architecture / review / orchestration générale → claude-code (PRIORITÉ HAUTE)
    const architecturePatterns = [
        /\b(architecture|architectural|architect)\b/,
        /\b(review|audit|analyse|analysis)\b/,
        /\b(plan|planning|design pattern)\b/,
        /\b(orchestrat)\b/,
    ];
    if (architecturePatterns.some((p) => p.test(lower))) {
        return 'claude-code';
    }
    // 4. Frontend : UI, React, Next, CSS, composants, pages
    const frontendPatterns = [
        /\b(frontend|front-end|ui|ux)\b/,
        /\b(react|next\.?js|tailwind|tsx|jsx)\b/,
        /\b(component|composant|page)\b/,
        /\b(css|styling|style sheet)\b/,
        /\b(dashboard|war ?room|landing)\b/,
    ];
    if (frontendPatterns.some((p) => p.test(lower))) {
        return 'claude-frontend';
    }
    // 5. Backend : API, services, DB, migrations, workflows
    const backendPatterns = [
        /\b(backend|back-end|api|endpoint|route handler)\b/,
        /\b(migration|database|supabase|sqlite|postgres)\b/,
        /\b(service|workflow|dispatch|router)\b/,
        /\b(typescript|ts file|\.ts\b)/,
        /\b(express|fastify|node\.?js)\b/,
        /\b(refactor|integration|multi-file)\b/,
    ];
    if (backendPatterns.some((p) => p.test(lower))) {
        return 'claude-backend';
    }
    // 6. Fallback : claude-code (orchestration générique)
    return 'claude-code';
}
// ── Mode 1 : CLI tmux Pro Max ($0) ────────────────────────────────────────────
async function dispatchMode1(task, start) {
    const session = chooseSession(task.task_description, {
        preferred_session: task.preferred_session,
        is_critical: task.is_critical,
    });
    logger.info({
        task: task.task_description.slice(0, 80),
        user: task.user_id,
        mode: 'mode_1_tmux',
        session,
    }, 'maestro.dispatch.start');
    try {
        const tmuxResult = await dispatchToTmuxSession(session, task.task_description, {
            timeoutMs: 600_000,
            pollIntervalMs: 60_000,
        });
        logger.info({ cost: 0, latency: tmuxResult.latency_ms, model: tmuxResult.model, session }, 'maestro.dispatch.mode1.success');
        logMaestroDispatch({
            user_id: task.user_id,
            mode: 'mode_1_tmux',
            task: task.task_description,
            provider: null,
            model: tmuxResult.model ?? null,
            success: true,
            cost_usd: 0,
            latency_ms: tmuxResult.latency_ms,
        });
        return {
            success: true,
            result: tmuxResult.content,
            provider_used: null,
            session_used: session,
            cost_usd: 0,
            latency_ms: tmuxResult.latency_ms,
            mode_used: 'mode_1_tmux',
        };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error({ error: msg, mode: 'mode_1_tmux', session }, 'maestro.dispatch.mode1.fail');
        logMaestroDispatch({
            user_id: task.user_id,
            mode: 'mode_1_tmux',
            task: task.task_description,
            provider: null,
            success: false,
            cost_usd: 0,
            latency_ms: Date.now() - start,
            error: msg,
        });
        return {
            success: false,
            result: '',
            provider_used: null,
            session_used: session,
            cost_usd: 0,
            latency_ms: Date.now() - start,
            error: msg,
            mode_used: 'mode_1_tmux',
        };
    }
}
// ── Mode 3 : Frontend Testing via claude-browser tmux session ($0) ────────────
/**
 * Mode 3 dispatch : envoie la tâche à la session tmux 'claude-browser'
 * spécialisée frontend testing (Playwright + axe + Lighthouse).
 *
 * Cible : tests UI, audits a11y/performance, screenshots, vérifications visuelles.
 * Cost : $0 (forfait Claude Pro Max)
 */
async function dispatchMode3(task, start) {
    logger.info({
        task: task.task_description.slice(0, 80),
        user: task.user_id,
        mode: 'mode_3_browser',
        session: 'claude-browser',
    }, 'maestro.dispatch.start');
    try {
        const tmuxResult = await dispatchToTmuxSession('claude-browser', task.task_description, {
            timeoutMs: 600_000,
            pollIntervalMs: 60_000,
        });
        logger.info({ cost: 0, latency: tmuxResult.latency_ms, model: tmuxResult.model, session: 'claude-browser' }, 'maestro.dispatch.mode3.success');
        logMaestroDispatch({
            user_id: task.user_id,
            mode: 'mode_3_browser',
            task: task.task_description,
            provider: null,
            model: tmuxResult.model ?? null,
            success: true,
            cost_usd: 0,
            latency_ms: tmuxResult.latency_ms,
        });
        return {
            success: true,
            result: tmuxResult.content,
            provider_used: null,
            session_used: 'claude-browser',
            cost_usd: 0,
            latency_ms: tmuxResult.latency_ms,
            mode_used: 'mode_3_browser',
        };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error({ error: msg, mode: 'mode_3_browser', session: 'claude-browser' }, 'maestro.dispatch.mode3.fail');
        logMaestroDispatch({
            user_id: task.user_id,
            mode: 'mode_3_browser',
            task: task.task_description,
            provider: null,
            success: false,
            cost_usd: 0,
            latency_ms: Date.now() - start,
            error: msg,
        });
        return {
            success: false,
            result: '',
            provider_used: null,
            session_used: 'claude-browser',
            cost_usd: 0,
            latency_ms: Date.now() - start,
            error: msg,
            mode_used: 'mode_3_browser',
        };
    }
}
// ── Mode 2 : API LLM directe avec CASCADE FALLBACK auto ───────────────────────
/**
 * Essaie un seul provider Mode 2.
 * Retourne success=false avec error si le provider échoue.
 * Le caller (dispatchMode2) décide de fallback ou non selon shouldFallback().
 */
async function tryDispatchMode2(task, start, provider) {
    logger.info({ task: task.task_description.slice(0, 80), provider, user: task.user_id, mode: 'mode_2_api' }, 'maestro.dispatch.start');
    try {
        const available = getAvailableProviders();
        if (!available.includes(provider)) {
            const err = `Provider ${provider} unavailable. Available: ${available.join(', ')}`;
            logger.warn({ provider, available }, 'maestro.dispatch.provider_unavailable');
            logMaestroDispatch({
                user_id: task.user_id,
                mode: 'mode_2_api',
                task: task.task_description,
                provider,
                success: false,
                cost_usd: 0,
                latency_ms: Date.now() - start,
                error: err,
            });
            return {
                success: false,
                result: '',
                provider_used: null,
                cost_usd: 0,
                latency_ms: Date.now() - start,
                error: err,
                mode_used: 'mode_2_api',
            };
        }
        let model;
        switch (provider) {
            case 'deepseek':
                model = 'deepseek-chat';
                break;
            case 'google':
                model = 'gemini-2.5-flash';
                break;
            case 'mistral':
                model = 'mistral-small-latest';
                break;
            case 'xai':
                model = 'grok-3-mini';
                break;
            case 'openai':
            default:
                model = 'gpt-4o-mini';
                break;
        }
        const response = await callLLM({
            provider,
            model,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT_MAESTRO },
                { role: 'user', content: task.task_description },
            ],
            max_tokens: task.max_tokens ?? 500,
            agent_id: `maestro_${task.user_id}`,
        });
        logger.info({ provider, cost: response.cost_usd, latency: response.latency_ms }, 'maestro.dispatch.mode2.success');
        logMaestroDispatch({
            user_id: task.user_id,
            mode: 'mode_2_api',
            task: task.task_description,
            provider,
            model,
            success: true,
            cost_usd: response.cost_usd,
            latency_ms: response.latency_ms,
        });
        return {
            success: true,
            result: response.content,
            provider_used: provider,
            cost_usd: response.cost_usd,
            latency_ms: response.latency_ms,
            mode_used: 'mode_2_api',
        };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error({ provider, error: msg, mode: 'mode_2_api' }, 'maestro.dispatch.mode2.fail');
        logMaestroDispatch({
            user_id: task.user_id,
            mode: 'mode_2_api',
            task: task.task_description,
            provider,
            success: false,
            cost_usd: 0,
            latency_ms: Date.now() - start,
            error: msg,
        });
        return {
            success: false,
            result: '',
            provider_used: null,
            cost_usd: 0,
            latency_ms: Date.now() - start,
            error: msg,
            mode_used: 'mode_2_api',
        };
    }
}
/**
 * Mode 2 avec CASCADE FALLBACK automatique.
 *
 * Workflow :
 * 1. Essaie le preferred_provider (default DeepSeek)
 * 2. Si erreur de crédit/quota → essaie le suivant dans FALLBACK_ORDER
 * 3. Si erreur NON liée crédit (vrai bug) → STOP cascade, retourne l'erreur
 * 4. Si TOUS les providers Mode 2 échouent → fallback ULTIME Mode 1 tmux ($0)
 */
async function dispatchMode2(task, start) {
    const preferred = task.preferred_provider ?? 'deepseek';
    // Ordre : preferred d'abord, puis le reste de FALLBACK_ORDER (sans doublon)
    const order = [
        preferred,
        ...FALLBACK_ORDER.filter((p) => p !== preferred),
    ];
    let lastResult = null;
    let lastError = '';
    for (const candidateProvider of order) {
        const result = await tryDispatchMode2(task, start, candidateProvider);
        // Succès → on sort tout de suite
        if (result.success) {
            logger.info({
                provider: candidateProvider,
                latency: result.latency_ms,
                cascade_position: order.indexOf(candidateProvider),
            }, 'maestro.cascade.success');
            return result;
        }
        // Échec → on regarde la raison
        lastResult = result;
        lastError = result.error || 'unknown error';
        // Si erreur N'EST PAS liée au crédit/quota → vrai bug, STOP cascade
        if (!shouldFallback(lastError)) {
            logger.warn({ provider: candidateProvider, error: lastError }, 'maestro.cascade.stop_non_credit_error');
            return result;
        }
        // Sinon (credit/quota/rate-limit) → continue au suivant
        logger.warn({
            provider: candidateProvider,
            error: lastError,
            next: order[order.indexOf(candidateProvider) + 1] ?? 'mode_1_tmux_fallback',
        }, 'maestro.cascade.fallback_next');
    }
    // Tous les providers Mode 2 ont échoué pour cause de crédit/quota
    // → Fallback ULTIME : Mode 1 tmux Pro Max ($0, ne peut pas être à court de crédit)
    logger.warn({ allErrors: lastError, providersAttempted: order }, 'maestro.cascade.all_mode2_failed_fallback_mode1');
    return dispatchMode1(task, start);
}
// ── Router ────────────────────────────────────────────────────────────────────
export async function dispatchToMaestro(task) {
    const start = Date.now();
    // Mode 3 (frontend testing) : explicit only via task.mode
    if (task.mode === 'mode_3_browser') {
        return dispatchMode3(task, start);
    }
    const useProMax = task.mode === 'mode_1_tmux' ||
        process.env['USE_MAESTRO_PRO_MAX'] === 'true';
    if (useProMax) {
        return dispatchMode1(task, start);
    }
    return dispatchMode2(task, start);
}
export default dispatchToMaestro;
//# sourceMappingURL=maestro_dispatcher.js.map