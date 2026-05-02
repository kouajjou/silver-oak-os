/**
 * Maestro Dispatcher — Sprint 2 Pipeline V1
 *
 * SOP V26 PROPER DISPATCH — 2 mai 2026 (v1.1)
 *
 * Mode 1 : CLI tmux via MCP Bridge (forfait Pro Max, $0 marginal)
 *   → 4 sessions Sonnet : claude-code, claude-backend, claude-frontend, opus (urgences only)
 *   → Routage automatique selon type de tâche
 *
 * Mode 2 : API LLM directe (5 providers concurrents, Anthropic banni R1)
 *   → DeepSeek, Gemini, OpenAI, Grok, Mistral
 *
 * SOP V26 Rules respected:
 *   R1 : Opus banni hardcodé — chooseSession() ne route à opus QUE si tâche critique
 *        ET USINE_OPUS_ALLOWED=true
 *   R47: Tier routing — Sonnet 4.6 (Mode 1) pour code, DeepSeek/Gemini (Mode 2) pour bash/audit
 *   R78: Cuisinier 1700€/h n'épluche pas — Maestro orchestre, workers exécutent
 */

import { callLLM, getAvailableProviders } from '../adapters/llm/index.js';
import type { LLMProvider } from '../adapters/llm/types.js';
import { dispatchToTmuxSession } from '../services/cli_tmux_dispatcher.js';
import type { TmuxSession } from '../services/cli_tmux_dispatcher.js';
import { logger } from '../logger.js';
import { logMaestroDispatch } from '../services/maestro-dispatch-log.js';

export type { LLMProvider };

export type MaestroMode = 'mode_1_tmux' | 'mode_2_api';

export interface MaestroTask {
  task_description: string;
  user_id: string;
  preferred_provider?: LLMProvider;
  preferred_session?: TmuxSession;
  max_tokens?: number;
  mode?: MaestroMode;
  is_critical?: boolean;
}

export interface MaestroResult {
  success: boolean;
  result: string;
  provider_used: LLMProvider | null;
  session_used?: TmuxSession;
  cost_usd: number;
  latency_ms: number;
  error?: string;
  mode_used?: MaestroMode;
}

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
export function chooseSession(
  task: string,
  hints: { preferred_session?: TmuxSession; is_critical?: boolean } = {}
): TmuxSession {
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

async function dispatchMode1(task: MaestroTask, start: number): Promise<MaestroResult> {
  const session = chooseSession(task.task_description, {
    preferred_session: task.preferred_session,
    is_critical: task.is_critical,
  });

  logger.info(
    {
      task: task.task_description.slice(0, 80),
      user: task.user_id,
      mode: 'mode_1_tmux',
      session,
    },
    'maestro.dispatch.start'
  );

  try {
    const tmuxResult = await dispatchToTmuxSession(session, task.task_description, {
      timeoutMs: 600_000,
      pollIntervalMs: 60_000,
    });

    logger.info(
      { cost: 0, latency: tmuxResult.latency_ms, model: tmuxResult.model, session },
      'maestro.dispatch.mode1.success'
    );

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
  } catch (err: unknown) {
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

// ── Mode 2 : API LLM directe (5 providers concurrents, Anthropic banni R1) ────

async function dispatchMode2(task: MaestroTask, start: number): Promise<MaestroResult> {
  const provider: LLMProvider = task.preferred_provider ?? 'deepseek';

  logger.info(
    { task: task.task_description.slice(0, 80), provider, user: task.user_id, mode: 'mode_2_api' },
    'maestro.dispatch.start'
  );

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
        success: false, result: '', provider_used: null,
        cost_usd: 0, latency_ms: Date.now() - start, error: err,
        mode_used: 'mode_2_api',
      };
    }

    let model: string;
    switch (provider) {
      case 'deepseek':
        model = 'deepseek-chat';
        break;
      case 'google':
        model = 'gemini-2.5-flash';
        break;
      case 'mistral' as LLMProvider:
        model = 'mistral-small-latest';
        break;
      case 'xai' as LLMProvider:
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

    logger.info(
      { provider, cost: response.cost_usd, latency: response.latency_ms },
      'maestro.dispatch.mode2.success'
    );

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
  } catch (err: unknown) {
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
      success: false, result: '', provider_used: null,
      cost_usd: 0, latency_ms: Date.now() - start, error: msg,
      mode_used: 'mode_2_api',
    };
  }
}

// ── Router ────────────────────────────────────────────────────────────────────

export async function dispatchToMaestro(task: MaestroTask): Promise<MaestroResult> {
  const start = Date.now();

  const useProMax =
    task.mode === 'mode_1_tmux' ||
    process.env['USE_MAESTRO_PRO_MAX'] === 'true';

  if (useProMax) {
    return dispatchMode1(task, start);
  }
  return dispatchMode2(task, start);
}

export default dispatchToMaestro;
