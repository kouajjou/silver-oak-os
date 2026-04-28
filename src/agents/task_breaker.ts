/**
 * Task Breaker — Vision Alex Autonome — Item #1
 * Transforms a markdown task list into an array of structured tasks for delegation.
 */

import { callLLM } from '../adapters/llm/index.js';
import logger from '../services/logger.js';

export type TaskType = 'technical' | 'marketing' | 'finance' | 'design' | 'data' | 'unknown';
export type AgentTarget = 'maestro' | 'sara' | 'leo' | 'marco' | 'nina' | 'alex';

export interface BrokenDownTask {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  agent_target: AgentTarget;
  dependencies: string[];
  estimated_effort_min: number;
  priority: 'P0' | 'P1' | 'P2';
  rationale: string;
}

export interface TaskBreakerResult {
  success: boolean;
  tasks: BrokenDownTask[];
  total_count: number;
  cost_usd: number;
  latency_ms: number;
  error?: string;
}

const SYSTEM_PROMPT = `You are the Task Breaker for Silver Oak OS.
Receive a markdown task list and break it into structured tasks.

For each task identify:
- type: technical | marketing | finance | design | data | unknown
- agent_target: maestro (tech/code) | sara (comms/marketing) | leo (content/design) | marco (ops/finance) | nina (research/data) | alex (orchestration)
- dependencies: array of task ids that must complete first (empty [] if none)
- estimated_effort_min: integer minutes
- priority: P0 (critical/blocking) | P1 (important) | P2 (nice-to-have)
- rationale: one sentence explaining agent choice

Respond ONLY with raw valid JSON — no markdown, no prose:
{"tasks":[{"id":"task_001","title":"...","description":"...","type":"technical","agent_target":"maestro","dependencies":[],"estimated_effort_min":60,"priority":"P0","rationale":"..."}]}`;

export async function breakDownTasks(
  markdown: string,
  user_id: string = 'default',
): Promise<TaskBreakerResult> {
  const start = Date.now();

  try {
    logger?.info('task_breaker.start', { markdown_length: markdown.length, user_id });

    const response = await callLLM({
      provider: 'deepseek',
      model: 'deepseek-chat',
      messages: [
        { role: 'user', content: `${SYSTEM_PROMPT}\n\n---\n\n${markdown}` },
      ],
      max_tokens: 2000,
      agent_id: `task_breaker_${user_id}`,
    });

    // Strip markdown code fences if LLM wraps response
    const clean = response.content.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '').trim();
    const parsed = JSON.parse(clean) as { tasks: Partial<BrokenDownTask>[] };

    const tasks: BrokenDownTask[] = (parsed.tasks ?? []).map((t, idx) => ({
      id: t.id ?? `task_${String(idx + 1).padStart(3, '0')}`,
      title: t.title ?? 'Untitled',
      description: t.description ?? '',
      type: (t.type as TaskType) ?? 'unknown',
      agent_target: (t.agent_target as AgentTarget) ?? 'maestro',
      dependencies: Array.isArray(t.dependencies) ? t.dependencies : [],
      estimated_effort_min: t.estimated_effort_min ?? 30,
      priority: t.priority ?? 'P1',
      rationale: t.rationale ?? '',
    }));

    logger?.info('task_breaker.success', {
      total_tasks: tasks.length,
      cost_usd: response.cost_usd,
      latency_ms: response.latency_ms,
    });

    return {
      success: true,
      tasks,
      total_count: tasks.length,
      cost_usd: response.cost_usd,
      latency_ms: response.latency_ms,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger?.error('task_breaker.fail', { error: msg });
    return {
      success: false,
      tasks: [],
      total_count: 0,
      cost_usd: 0,
      latency_ms: Date.now() - start,
      error: msg,
    };
  }
}

export default breakDownTasks;
