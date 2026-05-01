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
import { LLMAdapter } from './types.js';
export declare const anthropicAdapter: LLMAdapter;
//# sourceMappingURL=anthropic.d.ts.map