/**
 * gap-010: DeepSeek adapter (Chat / Reasoner)
 * Our primary T3 cheap provider — $0.14-0.55/M tokens
 * DEEPSEEK_API_KEY confirmed present in .env
 */

import { LLMAdapter, LLMRequest, LLMResponse } from './types.js';

interface DeepSeekChoice {
  message: { content: string };
}

interface DeepSeekAPIResponse {
  choices: DeepSeekChoice[];
  usage: { prompt_tokens: number; completion_tokens: number };
  error?: { message: string };
}

const PRICING: Record<string, { input: number; output: number }> = {
  'deepseek-chat':     { input: 0.14, output: 0.28 },
  'deepseek-reasoner': { input: 0.55, output: 2.19 },
};

export const deepseekAdapter: LLMAdapter = {
  provider: 'deepseek',
  available: !!process.env['DEEPSEEK_API_KEY'],

  async call(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    const apiKey = process.env['DEEPSEEK_API_KEY'];
    if (!apiKey) throw new Error('DEEPSEEK_API_KEY missing in .env');

    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: request.model || 'deepseek-chat',
        max_tokens: request.max_tokens ?? 1024,
        temperature: request.temperature ?? 0.7,
        messages: request.messages,
      }),
    });

    const data = (await res.json()) as DeepSeekAPIResponse;
    if (!res.ok || data.error) {
      throw new Error(`DeepSeek API error: ${data.error?.message ?? res.status}`);
    }

    const tokens_in  = data.usage.prompt_tokens;
    const tokens_out = data.usage.completion_tokens;
    const pricing    = PRICING[request.model] ?? PRICING['deepseek-chat'];
    const cost_usd   = (tokens_in * pricing.input + tokens_out * pricing.output) / 1_000_000;

    return {
      provider:   'deepseek',
      model:      request.model,
      content:    data.choices[0]?.message.content ?? '',
      tokens_in,
      tokens_out,
      cost_usd,
      latency_ms: Date.now() - start,
    };
  },
};
