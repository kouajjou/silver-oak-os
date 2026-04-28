/**
 * gap-010 Phase 2: Google Gemini adapter
 * Uses Generative Language REST API (no SDK dependency)
 * GOOGLE_API_KEY confirmed present in .env
 */

import { LLMAdapter, LLMRequest, LLMResponse, LLMMessage } from './types.js';

interface GeminiPart { text: string; }
interface GeminiContent { role: string; parts: GeminiPart[]; }
interface GeminiCandidate { content: GeminiContent; }
interface GeminiUsage { promptTokenCount: number; candidatesTokenCount: number; }
interface GeminiAPIResponse {
  candidates: GeminiCandidate[];
  usageMetadata: GeminiUsage;
  error?: { message: string };
}

const PRICING: Record<string, { input: number; output: number }> = {
  'gemini-2.5-flash': { input: 0.075, output: 0.30 },
  'gemini-2.5-pro':   { input: 1.25,  output: 5.00 },
  'gemini-2.0-flash': { input: 0.075, output: 0.30 },
};

function toGeminiContents(messages: LLMMessage[]): GeminiContent[] {
  return messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
}

function extractSystemInstruction(messages: LLMMessage[]): string | undefined {
  return messages.find(m => m.role === 'system')?.content;
}

export const googleAdapter: LLMAdapter = {
  provider: 'google',
  available: !!process.env['GOOGLE_API_KEY'],

  async call(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    const apiKey = process.env['GOOGLE_API_KEY'];
    if (!apiKey) throw new Error('GOOGLE_API_KEY missing in .env');

    const model = request.model || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const systemInstruction = extractSystemInstruction(request.messages);

    const body: Record<string, unknown> = {
      contents: toGeminiContents(request.messages),
      generationConfig: {
        maxOutputTokens: request.max_tokens ?? 1024,
        temperature: request.temperature ?? 0.7,
      },
    };
    if (systemInstruction) {
      body['systemInstruction'] = { parts: [{ text: systemInstruction }] };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as GeminiAPIResponse;
    if (!res.ok || data.error) {
      throw new Error(`Google Gemini API error: ${data.error?.message ?? res.status}`);
    }

    const tokens_in  = data.usageMetadata?.promptTokenCount ?? 0;
    const tokens_out = data.usageMetadata?.candidatesTokenCount ?? 0;
    const pricing    = PRICING[model] ?? PRICING['gemini-2.5-flash'];
    const cost_usd   = (tokens_in * pricing.input + tokens_out * pricing.output) / 1_000_000;

    return {
      provider:   'google',
      model,
      content:    data.candidates[0]?.content.parts[0]?.text ?? '',
      tokens_in,
      tokens_out,
      cost_usd,
      latency_ms: Date.now() - start,
    };
  },
};
