/**
 * gap-010 Phase 2: Together AI adapter (OpenAI-compatible)
 * Hosts Llama, Qwen, Mistral open-source models
 */

import { LLMAdapter, LLMRequest, LLMResponse } from './types.js';

interface TogetherChoice { message: { content: string }; }
interface TogetherAPIResponse {
  choices: TogetherChoice[];
  usage: { prompt_tokens: number; completion_tokens: number };
  error?: { message: string };
}

const PRICING: Record<string, { input: number; output: number }> = {
  'meta-llama/Llama-3.1-8B-Instruct-Turbo':  { input: 0.18, output: 0.18 },
  'meta-llama/Llama-3.3-70B-Instruct-Turbo': { input: 0.88, output: 0.88 },
  'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo': { input: 3.50, output: 3.50 },
  'Qwen/Qwen2.5-72B-Instruct-Turbo':         { input: 1.20, output: 1.20 },
};

export const togetherAdapter: LLMAdapter = {
  provider: 'together',
  available: !!process.env['TOGETHER_API_KEY'],

  async call(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    const apiKey = process.env['TOGETHER_API_KEY'];
    if (!apiKey) throw new Error('TOGETHER_API_KEY missing in .env');

    const res = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: request.model || 'meta-llama/Llama-3.1-8B-Instruct-Turbo',
        max_tokens: request.max_tokens ?? 1024,
        temperature: request.temperature ?? 0.7,
        messages: request.messages,
      }),
    });

    const data = (await res.json()) as TogetherAPIResponse;
    if (!res.ok || data.error) {
      throw new Error(`Together AI API error: ${data.error?.message ?? res.status}`);
    }

    const tokens_in  = data.usage.prompt_tokens;
    const tokens_out = data.usage.completion_tokens;
    const pricing    = PRICING[request.model] ?? PRICING['meta-llama/Llama-3.1-8B-Instruct-Turbo'];
    const cost_usd   = (tokens_in * pricing.input + tokens_out * pricing.output) / 1_000_000;

    return {
      provider:   'together',
      model:      request.model,
      content:    data.choices[0]?.message.content ?? '',
      tokens_in,
      tokens_out,
      cost_usd,
      latency_ms: Date.now() - start,
    };
  },
};
