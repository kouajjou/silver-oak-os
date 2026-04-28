/**
 * Alex Orchestrator — Sprint 2 Pipeline V1
 * Chief of Staff. Receives Karim messages, classifies intent,
 * answers directly (simple) or delegates to Maestro (technical).
 */

import { callLLM } from '../adapters/llm/index.js';
import { classifyIntent } from './intent_classifier.js';
import { dispatchToMaestro } from './maestro_dispatcher.js';
import { logger } from '../logger.js';

export interface AlexRequest {
  message: string;
  user_id: string;
  agent_id?: string;
}

export interface AlexResponse {
  success: boolean;
  response: string;
  intent: string;
  delegated_to_maestro: boolean;
  cost_usd: number;
  latency_ms: number;
  metadata?: Record<string, unknown>;
}

const SYSTEM_PROMPT_ALEX = `You are Alex, Chief of Staff for Karim Kouajjou (Silver Oak founder).
Personality: warm, direct, bilingual FR/EN, ADHD-aware (short sentences, bullet points, emojis when helpful).

Answer simple questions directly and concisely (max 150 words unless more detail is needed).
Do not explain your reasoning unless asked.`;

export async function alexHandle(request: AlexRequest): Promise<AlexResponse> {
  const start = Date.now();

  logger.info({ user: request.user_id, len: request.message.length }, 'alex.request');

  try {
    // 1. Classify intent
    const intent = await classifyIntent(request.message);
    logger.info({ intent: intent.intent, confidence: intent.confidence }, 'alex.intent');

    // 2. Technical task with high confidence → delegate to Maestro
    if (intent.intent === 'technical_task' && intent.confidence > 0.6) {
      const maestroResult = await dispatchToMaestro({
        task_description: request.message,
        user_id: request.user_id,
        max_tokens: 500,
      });

      const totalCost = intent.cost_usd + maestroResult.cost_usd;
      logger.info({ cost: totalCost, success: maestroResult.success }, 'alex.delegated_to_maestro');

      return {
        success: maestroResult.success,
        response: maestroResult.success
          ? `🤖 **Maestro** (plan d'exécution) :

${maestroResult.result}`
          : `❌ Maestro error: ${maestroResult.error ?? 'unknown'}`,
        intent: 'technical_task',
        delegated_to_maestro: true,
        cost_usd: totalCost,
        latency_ms: Date.now() - start,
        metadata: {
          provider_used: maestroResult.provider_used,
          intent_confidence: intent.confidence,
        },
      };
    }

    // 3. Simple question → Alex answers directly
    const response = await callLLM({
      provider: 'anthropic',
      model: 'claude-haiku-4-5',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_ALEX },
        { role: 'user', content: request.message },
      ],
      max_tokens: 600,
      agent_id: `alex_${request.user_id}`,
    });

    const totalCost = intent.cost_usd + response.cost_usd;
    logger.info({ cost: totalCost, intent: intent.intent }, 'alex.direct_reply');

    return {
      success: true,
      response: response.content,
      intent: intent.intent,
      delegated_to_maestro: false,
      cost_usd: totalCost,
      latency_ms: Date.now() - start,
      metadata: { intent_confidence: intent.confidence },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ error: msg }, 'alex.fail');
    return {
      success: false,
      response: `Alex error: ${msg}`,
      intent: 'unknown',
      delegated_to_maestro: false,
      cost_usd: 0,
      latency_ms: Date.now() - start,
    };
  }
}

export default alexHandle;
