/**
 * Maestro Dispatcher — V2 with SuperPowers integration
 * Receives technical task from Alex, executes via SuperPowers wrapper (Mode 2 API direct).
 * Mode 1 (CLI tmux via MCP Bridge) remains manual for V1.
 */

import { callWithSuperPowers } from '../superpowers/index.js';
import type { LLMProvider } from '../adapters/llm/types.js';
import type { SlashCommand } from '../superpowers/types.js';
import { getAvailableProviders } from '../adapters/llm/index.js';
import { logger } from '../logger.js';

export type { LLMProvider };

export interface MaestroTask {
  task_description: string;
  user_id: string;
  preferred_provider?: LLMProvider;
  preferred_model?: string;
  slash_command?: SlashCommand;
  tools?: string[];
  max_tokens?: number;
}

export interface MaestroResult {
  success: boolean;
  result: string;
  provider_used: LLMProvider | null;
  model_used: string | null;
  cost_usd: number;
  latency_ms: number;
  superpowers_active?: string[];
  mode_used: 'mode_2_api' | 'mode_1_tmux';
  error?: string;
}

const SYSTEM_PROMPT_MAESTRO = `You are Maestro, CTO of Silver Oak OS (SOP V26, 78 rules).
You receive technical tasks from Alex (Chief of Staff) and produce an execution plan.

Key SOP V26 rules that apply:
- /ultrathink before complex tasks
- Read files before any edit (R52 anti-hallucination)
- TypeScript compile clean before commit (0 errors)
- Tests: tsc + curl + regression (4 criteria) before TASK_DONE
- No pm2 restart all — pm2 reload <name> only
- Never delete — move to _archive/
- Telegram report at end of every task
- R79 ABSOLUE: never auto-merge main without Karim validation

Respond with structured plan (Karim has ADHD — tables + bullet points):
1. **ANALYSIS** : what needs doing
2. **ACTION_PLAN** : numbered steps (max 5)
3. **RISKS** : potential issues
4. **EXPECTED_OUTPUT** : success criteria

Be concise. Max 400 tokens.`;

/** Select best model for provider */
function selectModel(provider: LLMProvider, preferred?: string): string {
  if (preferred) return preferred;
  switch (provider) {
    case 'deepseek':   return 'deepseek-chat';
    case 'google':     return 'gemini-2.5-flash';
    case 'anthropic':  return 'claude-sonnet-4-6';
    case 'openai':     return 'gpt-4o-mini';
    default:           return 'deepseek-chat';
  }
}

export async function dispatchToMaestro(task: MaestroTask): Promise<MaestroResult> {
  const start = Date.now();
  const provider: LLMProvider = task.preferred_provider ?? 'deepseek';
  const model = selectModel(provider, task.preferred_model);

  logger.info(
    { task: task.task_description.slice(0, 80), provider, model, slash: task.slash_command, tools: task.tools, user: task.user_id },
    'maestro.dispatch.start',
  );

  try {
    const available = getAvailableProviders();
    if (!available.includes(provider)) {
      const errMsg = `Provider ${provider} unavailable. Available: ${available.join(', ')}`;
      logger.warn({ provider, available }, 'maestro.dispatch.provider_unavailable');
      return { success: false, result: '', provider_used: null, model_used: null, cost_usd: 0, latency_ms: Date.now() - start, mode_used: 'mode_2_api', error: errMsg };
    }

    const response = await callWithSuperPowers({
      provider,
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_MAESTRO },
        { role: 'user', content: task.task_description },
      ],
      max_tokens: task.max_tokens ?? 600,
      agent_id: `maestro_${task.user_id}`,
      slash_command: task.slash_command,
      tools: task.tools,
    });

    logger.info(
      { provider, model, cost: response.cost_usd, latency: response.latency_ms, superpowers: response.superpowers_active },
      'maestro.dispatch.success',
    );

    return {
      success: true,
      result: response.content,
      provider_used: provider,
      model_used: model,
      cost_usd: response.cost_usd,
      latency_ms: response.latency_ms,
      superpowers_active: response.superpowers_active,
      mode_used: 'mode_2_api',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ provider, model, error: msg }, 'maestro.dispatch.fail');
    return { success: false, result: '', provider_used: null, model_used: null, cost_usd: 0, latency_ms: Date.now() - start, mode_used: 'mode_2_api', error: msg };
  }
}

export default dispatchToMaestro;
