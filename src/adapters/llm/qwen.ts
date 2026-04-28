/**
 * gap-010 Phase 2: Qwen adapter (Alibaba DashScope, OpenAI-compatible)
 * QWEN_API_KEY confirmed present in .env (LEN=73)
 */

import { LLMAdapter, LLMRequest, LLMResponse } from './types.js';

interface QwenChoice { message: { content: string }; }
interface QwenAPIResponse {
  choices: QwenChoice[];
  usage: { prompt_tokens: number; completion_tokens: number };
  error?: { message: string };
}

const PRICING: Record<string, { input: number; output: number }> = {
  'qwen-turbo':        { input: 0.05, output: 0.20 },
  'qwen-plus':         { input: 0.40, output: 1.20 },
  'qwen-max':          { input: 1.40, output: 5.60 },
  'qwen2.5-72b-instruct': { input: 0.40, output: 1.20 },
  'qwen3-coder':       { input: 0.40, output: 1.20 },
};

export const qwenAdapter: LLMAdapter = {
  provider: 'qwen',
  available: !!process.env['QWEN_API_KEY'],

  async call(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    const apiKey = process.env['QWEN_API_KEY'];
    if (!apiKey) throw new Error('QWEN_API_KEY missing in .env');

    const res = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: request.model || 'qwen-turbo',
        max_tokens: request.max_tokens ?? 1024,
        temperature: request.temperature ?? 0.7,
        messages: request.messages,
      }),
    });

    const data = (await res.json()) as QwenAPIResponse;
    if (!res.ok || data.error) {
      throw new Error(`Qwen API error: ${data.error?.message ?? res.status}`);
    }

    const tokens_in  = data.usage.prompt_tokens;
    const tokens_out = data.usage.completion_tokens;
    const pricing    = PRICING[request.model] ?? PRICING['qwen-turbo'];
    const cost_usd   = (tokens_in * pricing.input + tokens_out * pricing.output) / 1_000_000;

    return {
      provider:   'qwen',
      model:      request.model,
      content:    data.choices[0]?.message.content ?? '',
      tokens_in,
      tokens_out,
      cost_usd,
      latency_ms: Date.now() - start,
    };
  },
};
