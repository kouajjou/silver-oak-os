/**
 * gap-010 Phase 2: Groq adapter (OpenAI-compatible, ultra-fast inference)
 * GROQ_API_KEY present in .env but value was empty at last check
 */

import { LLMAdapter, LLMRequest, LLMResponse } from './types.js';

interface GroqChoice { message: { content: string }; }
interface GroqAPIResponse {
  choices: GroqChoice[];
  usage: { prompt_tokens: number; completion_tokens: number };
  error?: { message: string };
}

const PRICING: Record<string, { input: number; output: number }> = {
  'llama-3.1-8b-instant':      { input: 0.05, output: 0.08 },
  'llama-3.3-70b-versatile':   { input: 0.59, output: 0.79 },
  'llama-3.1-70b-versatile':   { input: 0.59, output: 0.79 },
  'mixtral-8x7b-32768':        { input: 0.24, output: 0.24 },
  'gemma2-9b-it':              { input: 0.20, output: 0.20 },
};

export const groqAdapter: LLMAdapter = {
  provider: 'groq',
  available: !!process.env['GROQ_API_KEY'],

  async call(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    const apiKey = process.env['GROQ_API_KEY'];
    if (!apiKey) throw new Error('GROQ_API_KEY missing or empty in .env');

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: request.model || 'llama-3.1-8b-instant',
        max_tokens: request.max_tokens ?? 1024,
        temperature: request.temperature ?? 0.7,
        messages: request.messages,
      }),
    });

    const data = (await res.json()) as GroqAPIResponse;
    if (!res.ok || data.error) {
      throw new Error(`Groq API error: ${data.error?.message ?? res.status}`);
    }

    const tokens_in  = data.usage.prompt_tokens;
    const tokens_out = data.usage.completion_tokens;
    const pricing    = PRICING[request.model] ?? PRICING['llama-3.1-8b-instant'];
    const cost_usd   = (tokens_in * pricing.input + tokens_out * pricing.output) / 1_000_000;

    return {
      provider:   'groq',
      model:      request.model,
      content:    data.choices[0]?.message.content ?? '',
      tokens_in,
      tokens_out,
      cost_usd,
      latency_ms: Date.now() - start,
    };
  },
};
