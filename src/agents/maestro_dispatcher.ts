/**
 * Maestro Dispatcher — Sprint 2 Pipeline V1
 * Receives a technical task from Alex and executes it via the LLM adapter layer (Mode 2).
 * Mode 1 (CLI tmux via MCP Bridge) remains manual for V1.
 */

import { callLLM, getAvailableProviders } from '../adapters/llm/index.js';
import type { LLMProvider } from '../adapters/llm/types.js';
import { logger } from '../logger.js';

export type { LLMProvider };

export interface MaestroTask {
  task_description: string;
  user_id: string;
  preferred_provider?: LLMProvider;
  max_tokens?: number;
}

export interface MaestroResult {
  success: boolean;
  result: string;
  provider_used: LLMProvider | null;
  cost_usd: number;
  latency_ms: number;
  error?: string;
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

export async function dispatchToMaestro(task: MaestroTask): Promise<MaestroResult> {
  const start = Date.now();
  const provider: LLMProvider = task.preferred_provider ?? 'anthropic';

  logger.info({ task: task.task_description.slice(0, 80), provider, user: task.user_id }, 'maestro.dispatch.start');

  try {
    const available = getAvailableProviders();
    if (!available.includes(provider)) {
      const err = `Provider ${provider} unavailable. Available: ${available.join(', ')}`;
      logger.warn({ provider, available }, 'maestro.dispatch.provider_unavailable');
      return { success: false, result: '', provider_used: null, cost_usd: 0, latency_ms: Date.now() - start, error: err };
    }

    const model = provider === 'anthropic' ? 'claude-sonnet-4-6' : 'gpt-4o-mini';

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

    logger.info({ provider, cost: response.cost_usd, latency: response.latency_ms }, 'maestro.dispatch.success');

    return {
      success: true,
      result: response.content,
      provider_used: provider,
      cost_usd: response.cost_usd,
      latency_ms: response.latency_ms,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ provider, error: msg }, 'maestro.dispatch.fail');
    return { success: false, result: '', provider_used: null, cost_usd: 0, latency_ms: Date.now() - start, error: msg };
  }
}

export default dispatchToMaestro;
