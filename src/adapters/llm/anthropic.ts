/**
 * gap-010: Anthropic adapter — DISABLED HARD (zero-anthropic policy 2026-04-30)
 *
 * POLICY DECISION (Karim, 30 April 2026):
 *   - Tous les agents Silver Oak OS doivent passer par le forfait Pro Max claudeclaw
 *   - JAMAIS d'appel direct à api.anthropic.com (zero-cost, zero-leak)
 *   - Mode 1 = tmux Pro Max (forfait $0/h) via dispatchToTmuxSession
 *   - Mode 2 = autres providers (OpenAI/Google/DeepSeek/xAI/Mistral/etc.)
 *
 * Cet adapter est conservé pour la rétrocompat des types LLMProvider,
 * mais TOUS les appels throw immédiatement avec un message explicite.
 *
 * Si tu vois cette erreur en runtime, c'est que QUELQU'UN appelle
 * callLLM({provider:'anthropic'}) — REFUSE et redirige vers Mode 1.
 */

import { LLMAdapter, LLMRequest, LLMResponse } from './types.js';

const ZERO_ANTHROPIC_ERROR =
  'BLOCKED: zero-anthropic policy active (2026-04-30). ' +
  'Use Mode 1 (dispatchToTmuxSession) for Pro Max forfait, ' +
  'or Mode 2 with another provider (openai/google/deepseek/xai/mistral). ' +
  'See /app/silver-oak-os/.env (ANTHROPIC_API_KEY commented out).';

export const anthropicAdapter: LLMAdapter = {
  provider: 'anthropic',
  // HARD DISABLED — never available, never call
  get available(): boolean { return false; },

  async call(_request: LLMRequest): Promise<LLMResponse> {
    throw new Error(ZERO_ANTHROPIC_ERROR);
  },
};
