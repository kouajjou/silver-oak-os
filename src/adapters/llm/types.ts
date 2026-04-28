/**
 * gap-010: Common interface for multi-LLM providers
 * Maestro dispatches via this abstraction — no direct SDK imports outside adapters
 */

export type LLMProvider =
  | 'anthropic'
  | 'openai'
  | 'deepseek'
  | 'xai'
  | 'google'
  | 'mistral'
  | 'cohere'
  | 'together'
  | 'groq';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  provider: LLMProvider;
  model: string;
  messages: LLMMessage[];
  max_tokens?: number;
  temperature?: number;
  agent_id?: string; // for budget-tracker integration (gap-020)
}

export interface LLMResponse {
  provider: LLMProvider;
  model: string;
  content: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  latency_ms: number;
}

export interface LLMAdapter {
  provider: LLMProvider;
  available: boolean;
  call(request: LLMRequest): Promise<LLMResponse>;
}
