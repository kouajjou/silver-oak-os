/**
 * gap-010: Anthropic adapter (Claude Sonnet / Opus / Haiku)
 * Uses native fetch — no SDK dependency
 */

import { LLMAdapter, LLMRequest, LLMResponse } from './types.js';

interface AnthropicContent {
  type: string;
  text: string;
}

interface AnthropicAPIResponse {
  content: AnthropicContent[];
  usage: { input_tokens: number; output_tokens: number };
  error?: { message: string };
}

const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6':  { input: 3.00,  output: 15.00 },
  'claude-opus-4-6':    { input: 15.00, output: 75.00 },
  'claude-haiku-4-5':   { input: 0.80,  output: 4.00  },
};

export const anthropicAdapter: LLMAdapter = {
  provider: 'anthropic',
  available: !!process.env['ANTHROPIC_API_KEY'],

  async call(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    const apiKey = process.env['ANTHROPIC_API_KEY'];
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing in .env');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: request.model,
        max_tokens: request.max_tokens ?? 1024,
        temperature: request.temperature ?? 0.7,
        messages: request.messages,
      }),
    });

    const data = (await res.json()) as AnthropicAPIResponse;
    if (!res.ok || data.error) {
      throw new Error(`Anthropic API error: ${data.error?.message ?? res.status}`);
    }

    const tokens_in  = data.usage.input_tokens;
    const tokens_out = data.usage.output_tokens;
    const pricing    = PRICING[request.model] ?? PRICING['claude-sonnet-4-6'];
    const cost_usd   = (tokens_in * pricing.input + tokens_out * pricing.output) / 1_000_000;

    return {
      provider:   'anthropic',
      model:      request.model,
      content:    data.content[0]?.text ?? '',
      tokens_in,
      tokens_out,
      cost_usd,
      latency_ms: Date.now() - start,
    };
  },
};
