/**
 * gap-010 Phase 2: Qwen adapter via OpenRouter (cle existante est OpenRouter, pas DashScope)
 * QWEN_API_KEY confirmed present in .env (sk-or-v1-... OpenRouter format)
 */

import { LLMAdapter, LLMRequest, LLMResponse } from './types.js';

interface Choice { message: { content: string }; }
interface OpenRouterResponse {
  choices: Choice[];
  usage: { prompt_tokens: number; completion_tokens: number };
  error?: { message: string };
}

const PRICING: Record<string, { input: number; output: number }> = {
  'qwen-turbo':           { input: 0.05, output: 0.20 },
  'qwen-plus':            { input: 0.40, output: 1.20 },
  'qwen-max':             { input: 1.40, output: 5.60 },
  'qwen2.5-72b-instruct': { input: 0.40, output: 1.20 },
  'qwen3-coder':          { input: 0.40, output: 1.20 },
};

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL_PREFIX = 'qwen/';

export const qwenAdapter: LLMAdapter = {
  provider: 'qwen',
  available: !!process.env['QWEN_API_KEY'],

  async call(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    const apiKey = process.env['QWEN_API_KEY'];
    if (!apiKey) throw new Error('QWEN_API_KEY missing in .env');

    const model = request.model?.startsWith(OPENROUTER_MODEL_PREFIX)
      ? request.model
      : `${OPENROUTER_MODEL_PREFIX}${request.model || 'qwen-turbo'}`;

    const res = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: request.max_tokens ?? 1024,
        temperature: request.temperature ?? 0.7,
        messages: request.messages,
      }),
    });

    const data = (await res.json()) as OpenRouterResponse;
    if (!res.ok || data.error) {
      throw new Error(`Qwen/OpenRouter API error: ${data.error?.message ?? res.status}`);
    }

    const tokens_in  = data.usage.prompt_tokens;
    const tokens_out = data.usage.completion_tokens;
    const pricing    = PRICING[request.model] ?? PRICING['qwen-turbo'];
    const cost_usd   = (tokens_in * pricing.input + tokens_out * pricing.output) / 1_000_000;

    return {
      provider:   'qwen',
      model:      model,
      content:    data.choices[0]?.message.content ?? '',
      tokens_in,
      tokens_out,
      cost_usd,
      latency_ms: Date.now() - start,
    };
  },
};
