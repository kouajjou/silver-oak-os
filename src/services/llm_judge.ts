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

const SYSTEM_PROMPT_JUDGE = `You are a senior evaluator for Silver Oak OS.
Your role: evaluate if a task deliverable is COMPLETED with sufficient quality.

Task types you evaluate:
- technical: implementation plans, code, architecture
- marketing: strategies, content plans, campaigns
- finance: analysis, forecasts, reports
- design: specs, wireframes, mockups
- data: analysis plans, SQL, dashboards

GRADING (a well-structured plan IS a valid deliverable for planning tasks):
  A: excellent, comprehensive, all aspects covered, immediately actionable
  B: good, covers main points, minor gaps only
  C: acceptable, key elements present, some gaps but usable
  D: significant missing elements, major gaps
  F: empty response, pure error message, or completely off-topic

IMPORTANT: Grade based on quality and completeness of the deliverable TYPE.
A detailed strategic plan grades A-C, never F unless empty/gibberish.

Respond ONLY with raw JSON (no markdown, no code blocks, no extra text):
{"is_completed":true,"grade":"B","confidence":0.8,"reasoning":"short reason","missing_aspects":[],"recommendations":[]}`;

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

    // Robust JSON extraction — handles Gemini markdown code blocks, unterminated strings
    const raw = response.content;
    let parsed: Record<string, unknown>;
    try {
      const cleaned = raw.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim();
      const startIdx = cleaned.indexOf('{');
      const endIdx = cleaned.lastIndexOf('}');
      const jsonStr = startIdx !== -1 && endIdx > startIdx ? cleaned.slice(startIdx, endIdx + 1) : cleaned;
      parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    } catch {
      // Regex fallback — extract individual fields if JSON is malformed
      const gradeMatch = raw.match(/"grade"\s*:\s*"([A-F])"/);
      const completedMatch = raw.match(/"is_completed"\s*:\s*(true|false)/);
      const confidenceMatch = raw.match(/"confidence"\s*:\s*([\d.]+)/);
      parsed = {
        grade: gradeMatch?.[1] ?? 'F',
        is_completed: completedMatch?.[1] === 'true',
        confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5,
        reasoning: 'JSON parse failed — extracted via regex fallback',
        missing_aspects: [],
        recommendations: [],
      };
    }

    logger.info('llm_judge.success', {
      grade: parsed.grade,
      is_completed: parsed.is_completed,
      cost: response.cost_usd,
    });

    return {
      is_completed: parsed.is_completed === true,
      grade: ((parsed.grade as string) || 'F') as CompletionGrade,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      reasoning: (parsed.reasoning as string) || '',
      missing_aspects: Array.isArray(parsed.missing_aspects) ? (parsed.missing_aspects as string[]) : [],
      recommendations: Array.isArray(parsed.recommendations) ? (parsed.recommendations as string[]) : [],
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
