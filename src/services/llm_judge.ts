/**
 * LLM Judge - Vision Alex Autonome
 * Cross-LLM evaluator with Gemini (per SOP V26 R14 - avoid self-grading bias)
 * Decides: task completed? quality grade?
 */

import { callLLM } from '../adapters/llm/index.js';
import logger from './logger.js';

export type CompletionGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface JudgeResult {
  is_completed: boolean;
  grade: CompletionGrade;
  confidence: number;
  reasoning: string;
  missing_aspects: string[];
  recommendations: string[];
  cost_usd: number;
  latency_ms: number;
}

export interface JudgeRequest {
  task_description: string;
  expected_output: string;
  actual_output: string;
  task_type?: string;
}

const SYSTEM_PROMPT_JUDGE = `You are a senior PhD code reviewer for Silver Oak OS.
Your role: evaluate if a task is genuinely COMPLETED with high quality.

CRITICAL RULES:
- Be strict but fair
- Detect partial implementations, hallucinations, missing tests
- Apply SOP V26 standards
- Grade on:
  - A : excellent, production-ready, all DoD met
  - B : good, minor improvements needed
  - C : acceptable but gaps
  - D : significant issues
  - F : failed, must redo

Respond ONLY in valid JSON:
{
  "is_completed": true/false,
  "grade": "A/B/C/D/F",
  "confidence": 0.0-1.0,
  "reasoning": "Why this grade",
  "missing_aspects": ["thing 1", "thing 2"],
  "recommendations": ["fix 1", "improve 2"]
}

No prose, NO markdown blocks, ONLY raw JSON.`;

export async function judge(request: JudgeRequest): Promise<JudgeResult> {
  const start = Date.now();

  try {
    logger.info('llm_judge.start', {
      task_type: request.task_type,
      task_length: request.task_description.length,
      output_length: request.actual_output.length,
    });

    const userPrompt = `# Task Description
${request.task_description}

# Expected Output
${request.expected_output}

# Actual Output
${request.actual_output}

Evaluate:`;

    const response = await callLLM({
      provider: 'google',
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'system' as const, content: SYSTEM_PROMPT_JUDGE },
        { role: 'user' as const, content: userPrompt },
      ],
      max_tokens: 800,
      agent_id: 'llm_judge_gemini',
    });

    const cleanContent = response.content.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanContent);

    logger.info('llm_judge.success', {
      grade: parsed.grade,
      is_completed: parsed.is_completed,
      cost: response.cost_usd,
    });

    return {
      is_completed: parsed.is_completed === true,
      grade: parsed.grade || 'F',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      reasoning: parsed.reasoning || '',
      missing_aspects: Array.isArray(parsed.missing_aspects) ? parsed.missing_aspects : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      cost_usd: response.cost_usd,
      latency_ms: response.latency_ms,
    };
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    logger.error('llm_judge.fail', { error: errMsg });
    return {
      is_completed: false,
      grade: 'F',
      confidence: 0,
      reasoning: `Judge error: ${errMsg}`,
      missing_aspects: [],
      recommendations: ['Retry judge'],
      cost_usd: 0,
      latency_ms: Date.now() - start,
    };
  }
}

export default judge;
