/**
 * gap-010: Multi-LLM router — Maestro entry point for all LLM dispatch
 *
 * Phase 1 (complete): Anthropic + OpenAI + DeepSeek
 * Phase 2 (complete): Google + xAI + Mistral + Cohere + Together + Groq + Qwen + MiniMax + Perplexity
 */
import { LLMRequest, LLMResponse, LLMAdapter, LLMProvider } from './types.js';
/**
 * Dispatch an LLM call to the appropriate provider.
 * Tracks cost automatically via budget-tracker (gap-020).
 */
export declare function callLLM(request: LLMRequest): Promise<LLMResponse>;
/**
 * Return list of providers with valid API keys configured.
 */
export declare function getAvailableProviders(): LLMProvider[];
/**
 * Return status of all 12 registered providers.
 */
export declare function getProvidersStatus(): Array<{
    provider: LLMProvider;
    available: boolean;
}>;
export type { LLMRequest, LLMResponse, LLMAdapter, LLMProvider };
//# sourceMappingURL=index.d.ts.map