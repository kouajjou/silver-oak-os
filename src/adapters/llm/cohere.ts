/**
 * gap-010 Phase 2: Cohere adapter (v2 Chat API)
 * Response format differs from OpenAI
 */

import { LLMAdapter, LLMRequest, LLMResponse } from './types.js';

interface CohereContentItem { type: string; text: string; }
interface CohereMessage { role: string; content: CohereContentItem[]; }
interface CohereUsageTokens { input_tokens: number; output_tokens: number; }
interface CohereUsage { tokens: CohereUsageTokens; }
interface CohereAPIResponse {
  message: CohereMessage;
  usage: CohereUsage;
  error?: { message: string };
}

const PRICING: Record<string, { input: number; output: number }> = {
  'command-r':       { input: 0.15, output: 0.60 },
  'command-r-plus':  { input: 2.50, output: 10.00 },
  'command-a-03-2025': { input: 2.50, output: 10.00 },
};

export const cohereAdapter: LLMAdapter = {
  provider: 'cohere',
  available: !!process.env['COHERE_API_KEY'],

  async call(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    const apiKey = process.env['COHERE_API_KEY'];
    if (!apiKey) throw new Error('COHERE_API_KEY missing in .env');

    const res = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: request.model || 'command-r',
        messages: request.messages,
        max_tokens: request.max_tokens ?? 1024,
        temperature: request.temperature ?? 0.7,
      }),
    });

    const data = (await res.json()) as CohereAPIResponse;
    if (!res.ok || data.error) {
      throw new Error(`Cohere API error: ${data.error?.message ?? res.status}`);
    }

    const tokens_in  = data.usage?.tokens?.input_tokens ?? 0;
    const tokens_out = data.usage?.tokens?.output_tokens ?? 0;
    const pricing    = PRICING[request.model] ?? PRICING['command-r'];
    const cost_usd   = (tokens_in * pricing.input + tokens_out * pricing.output) / 1_000_000;
    const content    = data.message?.content?.[0]?.text ?? '';

    return {
      provider:   'cohere',
      model:      request.model,
      content,
      tokens_in,
      tokens_out,
      cost_usd,
      latency_ms: Date.now() - start,
    };
  },
};
