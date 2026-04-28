/**
 * Maestro Dispatcher — Sprint 2 Pipeline V1
 * Mode 1 : CLI tmux via MCP Bridge (forfait Pro Max, $0 marginal)
 * Mode 2 : API concurrent (DeepSeek default, Gemini Flash fallback) — real execution
 *
 * PATCH 2026-04-29 — fix(maestro_dispatcher): replace Mode 2 fantome by real dispatch
 * Reason: Mode 2 was calling Anthropic Sonnet to generate a 300-token plan that nobody
 * executed. Now Mode 2 dispatches to a real coder LLM with max_tokens=4000.
 * Provider priority: deepseek-chat -> gemini-2.0-flash -> gpt-4o-mini (no Anthropic).
 *
 * Selection du mode :
 *   - task.mode === mode_1_tmux       -> toujours Mode 1
 *   - USE_MAESTRO_PRO_MAX=true (env)  -> Mode 1 par defaut
 *   - sinon                           -> Mode 2 (DeepSeek / Gemini)
 */

import { callLLM, getAvailableProviders } from '../adapters/llm/index.js';
import type { LLMProvider } from '../adapters/llm/types.js';
import { dispatchToTmuxSession } from '../services/cli_tmux_dispatcher.js';
import { logger } from '../logger.js';

export type { LLMProvider };

export type MaestroMode = 'mode_1_tmux' | 'mode_2_api';

export interface MaestroTask {
  task_description: string;
  user_id: string;
  preferred_provider?: LLMProvider;
  max_tokens?: number;
  mode?: MaestroMode;
}

export interface MaestroResult {
  success: boolean;
  result: string;
  provider_used: LLMProvider | null;
  cost_usd: number;
  latency_ms: number;
  error?: string;
  mode_used?: MaestroMode;
}

// ── System prompt : real executor (PATCH 2026-04-29) ─────────────────────────
// Renamed from SYSTEM_PROMPT_MAESTRO (300-token plan generator, archived below).
// New prompt: Maestro executes real tasks, not just plans.

const MAESTRO_DEV_SENIOR_SYSTEM_PROMPT = `You are Maestro, a senior PhD developer at Silver Oak OS (SOP V26, 78 rules).
You receive technical coding tasks from Alex (Chief of Staff) and execute them with precision.

You ALWAYS:
- Write clean TypeScript code following existing project patterns
- Read file structure before proposing changes (R2)
- Add tsc --noEmit verification steps
- Return executable code with clear implementation, not vague plans
- Use pm2 reload <name> --update-env — NEVER pm2 restart all (R17)
- Move files to _archive/ instead of deleting (JAMAIS SUPPRIMER rule)
- Include a TASK_DONE signal at the end of your response

You NEVER:
- Invent library APIs you are not certain exist
- Skip tests for critical production code
- Call Anthropic API directly in your code suggestions

Output format: implementation steps + code snippets + verification commands.
Be concise. Max 2000 tokens unless task requires more detail.`;

// archived: SYSTEM_PROMPT_MAESTRO (Mode 2 fantome — 300-token plan generator — 2026-04-29)
// This prompt generated ACTION_PLAN + PROVIDER_RECOMMENDATION + EXPECTED_OUTPUT
// but nobody executed the plan. Replaced by MAESTRO_DEV_SENIOR_SYSTEM_PROMPT.
// const SYSTEM_PROMPT_MAESTRO = `You are Maestro, CTO of Silver Oak OS (SOP V26, 78 rules).
// You receive technical tasks from Alex and produce an execution plan.
// Respond with: 1. ACTION_PLAN 2. PROVIDER_RECOMMENDATION 3. EXPECTED_OUTPUT
// Be concise. Max 300 tokens.`;

// ── Mode 1 : CLI tmux Pro Max ($0) ────────────────────────────────────────────

async function dispatchMode1(task: MaestroTask, start: number): Promise<MaestroResult> {
  logger.info(
    { task: task.task_description.slice(0, 80), user: task.user_id, mode: 'mode_1_tmux' },
    'maestro.dispatch.start'
  );

  try {
    const tmuxResult = await dispatchToTmuxSession('opus', task.task_description, {
      timeoutMs: 600_000,
      pollIntervalMs: 60_000,
    });

    logger.info(
      { cost: 0, latency: tmuxResult.latency_ms, model: tmuxResult.model },
      'maestro.dispatch.mode1.success'
    );

    return {
      success: true,
      result: tmuxResult.content,
      provider_used: 'anthropic', // Opus is Anthropic model (Pro Max tmux, $0 marginal)
      cost_usd: 0,
      latency_ms: tmuxResult.latency_ms,
      mode_used: 'mode_1_tmux',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ error: msg, mode: 'mode_1_tmux' }, 'maestro.dispatch.mode1.fail');
    return {
      success: false,
      result: '',
      provider_used: null,
      cost_usd: 0,
      latency_ms: Date.now() - start,
      error: msg,
      mode_used: 'mode_1_tmux',
    };
  }
}

// ── Mode 2 : Real concurrent dispatch (DeepSeek + Gemini fallback) ────────────
// PATCH 2026-04-29: replaced Mode 2 fantome (Anthropic plan generator) by real coder LLMs.
// Provider priority: deepseek-chat -> gemini-2.0-flash -> gpt-4o-mini (no Anthropic).
// archived: const provider: LLMProvider = task.preferred_provider ?? 'anthropic';
// archived: const model = provider === 'anthropic' ? 'claude-sonnet-4-6' : 'gpt-4o-mini';

const MODE2_PROVIDER_ORDER: Array<{ provider: LLMProvider; model: string }> = [
  { provider: 'deepseek', model: 'deepseek-chat' },    // default: cheap + good coder
  { provider: 'google',   model: 'gemini-2.0-flash' }, // fallback: fast + cheap
  { provider: 'openai',   model: 'gpt-4o-mini' },      // last resort
];

async function dispatchMode2(task: MaestroTask, start: number): Promise<MaestroResult> {
  logger.info(
    { task: task.task_description.slice(0, 80), user: task.user_id, mode: 'mode_2_api' },
    'maestro.dispatch.start'
  );

  const available = getAvailableProviders();

  // If caller specified a non-Anthropic provider and it is available, prioritize it
  const preferredEntry = task.preferred_provider && task.preferred_provider !== 'anthropic'
    ? MODE2_PROVIDER_ORDER.find(e => e.provider === task.preferred_provider)
    : undefined;

  const orderedProviders = preferredEntry
    ? [preferredEntry, ...MODE2_PROVIDER_ORDER.filter(e => e.provider !== preferredEntry.provider)]
    : MODE2_PROVIDER_ORDER;

  let lastError = 'no provider attempted';

  for (const { provider, model } of orderedProviders) {
    if (!available.includes(provider)) {
      logger.debug({ provider }, 'maestro.dispatch.mode2.provider_unavailable');
      continue;
    }

    try {
      const response = await callLLM({
        provider,
        model,
        messages: [
          { role: 'system' as const, content: MAESTRO_DEV_SENIOR_SYSTEM_PROMPT },
          { role: 'user' as const, content: task.task_description },
        ],
        max_tokens: task.max_tokens ?? 4000,
        agent_id: `maestro_${task.user_id}`,
      });

      logger.info(
        { provider, model, cost: response.cost_usd, latency: response.latency_ms },
        'maestro.dispatch.mode2.success'
      );

      return {
        success: true,
        result: response.content,
        provider_used: provider,
        cost_usd: response.cost_usd,
        latency_ms: response.latency_ms,
        mode_used: 'mode_2_api',
      };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      logger.warn({ provider, model, error: lastError }, 'maestro.dispatch.mode2.provider_fail');
      // try next provider in priority order
    }
  }

  // All providers exhausted
  logger.error({ lastError }, 'maestro.dispatch.mode2.all_providers_failed');
  return {
    success: false,
    result: '',
    provider_used: null,
    cost_usd: 0,
    latency_ms: Date.now() - start,
    error: `Mode 2: all providers failed. Last error: ${lastError}`,
    mode_used: 'mode_2_api',
  };
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
