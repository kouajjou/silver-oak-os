/**
 * Intent Classifier - Sprint 2 Pipeline V1
 * Detects if a message is a simple question or a technical task.
 * Uses claude-haiku-4-5 via SDK Claude Code Pro Max ($0 forfait Karim).
 *
 * archived: was using callLLM DeepSeek API (PAYANT zero-anthropic Phase F)
 */

import { query } from '@anthropic-ai/claude-agent-sdk';

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

// Helper: call Claude Code SDK Pro Max ($0 forfait) for a simple single-turn query
// archived: was callLLM({ provider: 'deepseek', model: 'deepseek-chat' }) -- PAYANT
async function callProMaxHaiku(prompt: string): Promise<string> {
  let resultText = '';
  for await (const event of query({
    prompt,
    options: {
      model: 'claude-haiku-4-5',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      settingSources: ['user'],
    },
  })) {
    const ev = event as Record<string, unknown>;
    if (ev['type'] === 'result') {
      resultText = (ev['result'] as string | null | undefined) ?? '';
    }
  }
  return resultText;
}

export async function classifyIntent(message: string): Promise<IntentResult> {
  try {
    const fullPrompt = SYSTEM_PROMPT + '\n\nUser message to classify: ' + message;
    const content = await callProMaxHaiku(fullPrompt);

    const clean = content.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean) as { intent?: string; confidence?: number; reasoning?: string };

    const intent = (parsed.intent === 'simple_question' || parsed.intent === 'technical_task')
      ? parsed.intent
      : 'unknown';

    return {
      intent,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
      reasoning: parsed.reasoning ?? '',
      cost_usd: 0, // archived: was response.cost_usd -- Pro Max forfait = $0
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { intent: 'unknown', confidence: 0, reasoning: 'classifier error: ' + msg, cost_usd: 0 };
  }
}

export default classifyIntent;
