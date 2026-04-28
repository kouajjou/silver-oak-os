/**
 * gap-010: Multi-LLM router — Maestro entry point for all LLM dispatch
 *
 * Phase 1 (complete): Anthropic + OpenAI + DeepSeek
 * Phase 2 (complete): Google + xAI + Mistral + Cohere + Together + Groq + Qwen + MiniMax + Perplexity
 */

import { LLMRequest, LLMResponse, LLMAdapter, LLMProvider } from './types.js';
import { anthropicAdapter }  from './anthropic.js';
import { openaiAdapter }     from './openai.js';
import { deepseekAdapter }   from './deepseek.js';
import { googleAdapter }     from './google.js';
import { xaiAdapter }        from './xai.js';
import { mistralAdapter }    from './mistral.js';
import { cohereAdapter }     from './cohere.js';
import { togetherAdapter }   from './together.js';
import { groqAdapter }       from './groq.js';
import { qwenAdapter }       from './qwen.js';
import { minimaxAdapter }    from './minimax.js';
import { perplexityAdapter } from './perplexity.js';
import { trackCost } from '../../services/budget-tracker.js';

const ADAPTERS: Partial<Record<LLMProvider, LLMAdapter>> = {
  anthropic:  anthropicAdapter,
  openai:     openaiAdapter,
  deepseek:   deepseekAdapter,
  google:     googleAdapter,
  xai:        xaiAdapter,
  mistral:    mistralAdapter,
  cohere:     cohereAdapter,
  together:   togetherAdapter,
  groq:       groqAdapter,
  qwen:       qwenAdapter,
  minimax:    minimaxAdapter,
  perplexity: perplexityAdapter,
};

/**
 * Dispatch an LLM call to the appropriate provider.
 * Tracks cost automatically via budget-tracker (gap-020).
 */
export async function callLLM(request: LLMRequest): Promise<LLMResponse> {
  const adapter = ADAPTERS[request.provider];
  if (!adapter) {
    throw new Error(`LLM provider '${request.provider}' not registered`);
  }
  if (!adapter.available) {
    throw new Error(
      `LLM provider '${request.provider}' unavailable — missing API key in .env`,
    );
  }

  const response = await adapter.call(request);

  if (request.agent_id && response.cost_usd > 0) {
    trackCost({
      agent_id:   request.agent_id,
      cost_usd:   response.cost_usd,
      tokens_in:  response.tokens_in,
      tokens_out: response.tokens_out,
      model:      `${response.provider}/${response.model}`,
    });
  }

  return response;
}

/**
 * Return list of providers with valid API keys configured.
 */
export function getAvailableProviders(): LLMProvider[] {
  return (Object.entries(ADAPTERS) as Array<[LLMProvider, LLMAdapter | undefined]>)
    .filter(([, a]) => a?.available)
    .map(([p]) => p);
}

/**
 * Return status of all 12 registered providers.
 */
export function getProvidersStatus(): Array<{ provider: LLMProvider; available: boolean }> {
  return (Object.entries(ADAPTERS) as Array<[LLMProvider, LLMAdapter | undefined]>)
    .map(([p, a]) => ({ provider: p, available: a?.available ?? false }));
}

export type { LLMRequest, LLMResponse, LLMAdapter, LLMProvider };
