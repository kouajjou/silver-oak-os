/**
 * Intent Classifier — Sprint 2 Pipeline V1
 * Detects if a message is a simple question or a technical task.
 * Uses claude-haiku-4-5 for cost efficiency.
 */

import { callLLM } from '../adapters/llm/index.js';

export type IntentType = 'simple_question' | 'technical_task' | 'unknown';

export interface IntentResult {
  intent: IntentType;
  confidence: number;
  reasoning: string;
  cost_usd: number;
}

const SYSTEM_PROMPT = `You are an intent classifier for Silver Oak OS.
Classify the user message into exactly one of:
- "simple_question": general question, conversation, information request, status check
- "technical_task": code change, bug fix, deployment, refactor, system action, file modification

Respond ONLY with valid JSON, no markdown:
{"intent": "simple_question", "confidence": 0.95, "reasoning": "brief reason"}`;

export async function classifyIntent(message: string): Promise<IntentResult> {
  try {
    const response = await callLLM({
      // archived: Anthropic Haiku → DeepSeek (zero-anthropic Phase F)
      // provider: 'anthropic',
      // model: 'claude-haiku-4-5',
      provider: 'deepseek',
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
      max_tokens: 120,
      agent_id: 'intent_classifier',
    });

    const clean = response.content.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean) as { intent?: string; confidence?: number; reasoning?: string };

    const intent = (parsed.intent === 'simple_question' || parsed.intent === 'technical_task')
      ? parsed.intent
      : 'unknown';

    return {
      intent,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
      reasoning: parsed.reasoning ?? '',
      cost_usd: response.cost_usd,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { intent: 'unknown', confidence: 0, reasoning: `classifier error: ${msg}`, cost_usd: 0 };
  }
}

export default classifyIntent;
