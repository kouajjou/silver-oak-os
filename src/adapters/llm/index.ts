/**
 * gap-010: Multi-LLM router — Maestro entry point for all LLM dispatch
 *
 * Phase 1: Anthropic + OpenAI + DeepSeek wired
 * Phase 2 TODO: xAI, Google, Mistral, Cohere, Together, Groq
 */

import { LLMRequest, LLMResponse, LLMAdapter, LLMProvider } from './types.js';
import { anthropicAdapter } from './anthropic.js';
import { openaiAdapter } from './openai.js';
import { deepseekAdapter } from './deepseek.js';
import { trackCost } from '../../services/budget-tracker.js';

const ADAPTERS: Partial<Record<LLMProvider, LLMAdapter>> = {
  anthropic: anthropicAdapter,
  openai:    openaiAdapter,
  deepseek:  deepseekAdapter,
  // xai:     TODO Phase 2 (rate limited, planned)
  // google:  TODO Phase 2 (@google/genai SDK — see gemini.ts)
  // mistral: TODO Phase 2
  // cohere:  TODO Phase 2
  // together:TODO Phase 2
  // groq:    TODO Phase 2 (GROQ_API_KEY present in .env)
};

/**
 * Dispatch an LLM call to the appropriate provider.
 * Tracks cost automatically via budget-tracker (gap-020).
 */
export async function callLLM(request: LLMRequest): Promise<LLMResponse> {
  const adapter = ADAPTERS[request.provider];
  if (!adapter) {
    throw new Error(
      `LLM provider '${request.provider}' not implemented yet — Phase 2 TODO`,
    );
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

export type { LLMRequest, LLMResponse, LLMAdapter, LLMProvider };
