/**
 * Maestro Dispatcher — Sprint 2 Pipeline V1
 * Mode 1 : CLI tmux via MCP Bridge (forfait Pro Max, $0 marginal)
 * Mode 2 : API DeepSeek/Gemini directe (fallback ou override — archived: était Anthropic)
 *
 * Sélection du mode :
 *   - task.mode === 'mode_1_tmux'      → toujours Mode 1
 *   - USE_MAESTRO_PRO_MAX=true (env)   → Mode 1 par défaut
 *   - sinon                            → Mode 2 (API DeepSeek — archived: était Anthropic)
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
      provider_used: null, // archived: was 'anthropic' label — tmux mode has no direct API cost
      cost_usd: 0,                // Pro Max forfait = $0 marginal
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

// ── Mode 2 : API DeepSeek directe (archived: était Anthropic — zero-anthropic Phase F) ──────────

async function dispatchMode2(task: MaestroTask, start: number): Promise<MaestroResult> {
  // archived: default was 'anthropic' — zero-anthropic Phase F
  // const provider: LLMProvider = task.preferred_provider ?? 'anthropic';
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
      return {
        success: false, result: '', provider_used: null,
        cost_usd: 0, latency_ms: Date.now() - start, error: err,
        mode_used: 'mode_2_api',
      };
    }

    // archived: was anthropic→claude-sonnet-4-6, else→gpt-4o-mini — zero-anthropic Phase F
    // const model = provider === 'anthropic' ? 'claude-sonnet-4-6' : 'gpt-4o-mini';
    const model = provider === 'deepseek' ? 'deepseek-chat'
      : provider === 'google' ? 'gemini-2.5-flash'
      : 'gpt-4o-mini'; // openai/xai fallback

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
