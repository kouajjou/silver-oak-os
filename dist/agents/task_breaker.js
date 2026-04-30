/**
 * Task Breaker — Vision Alex Autonome
 * Decomposes file content or a request into executable tasks with agent routing.
 * Uses DeepSeek (cost-effective) for task decomposition.
 */
import { callLLM } from '../adapters/llm/index.js';
import { logger } from '../logger.js';
const SYSTEM_PROMPT_BREAKER = `You are a task decomposer for Silver Oak OS multi-agent system.
Given a document or request, extract a list of concrete, executable tasks.

Agents available:
- maestro: technical tasks (code, infra, APIs, TypeScript, databases)
- sara: marketing tasks (copy, campaigns, social media)
- leo: design tasks (UI/UX, visuals, layouts)
- marco: finance tasks (budgets, analysis, projections)
- nina: data tasks (analytics, reports, data pipelines)

Respond ONLY with valid JSON array (no markdown fences):
[
  {
    "id": "task_001",
    "title": "Short title",
    "description": "Clear description of what to do",
    "type": "technical|marketing|design|finance|data|unknown",
    "agent_target": "maestro|sara|leo|marco|nina",
    "dependencies": [],
    "estimated_effort_min": 30,
    "priority": "P0|P1|P2|P3",
    "rationale": "Why this agent for this task"
  }
]

Max 10 tasks. Be precise and actionable.`;
export async function breakDownTasks(file_content, user_id) {
    const start = Date.now();
    try {
        logger.info({ user: user_id, len: file_content.length }, 'task_breaker.start');
        const response = await callLLM({
            provider: 'deepseek',
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT_BREAKER },
                { role: 'user', content: `Decompose into tasks:\n\n${file_content.slice(0, 4000)}` },
            ],
            max_tokens: 2000,
            agent_id: `task_breaker_${user_id}`,
        });
        const clean = response.content.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        if (!Array.isArray(parsed)) {
            throw new Error('task_breaker: LLM did not return an array');
        }
        const tasks = parsed.map((t, i) => ({
            id: typeof t['id'] === 'string' ? t['id'] : `task_${String(i + 1).padStart(3, '0')}`,
            title: typeof t['title'] === 'string' ? t['title'] : `Task ${i + 1}`,
            description: typeof t['description'] === 'string' ? t['description'] : '',
            type: (typeof t['type'] === 'string' ? t['type'] : 'unknown'),
            agent_target: (typeof t['agent_target'] === 'string' ? t['agent_target'] : 'maestro'),
            dependencies: Array.isArray(t['dependencies']) ? t['dependencies'] : [],
            estimated_effort_min: typeof t['estimated_effort_min'] === 'number' ? t['estimated_effort_min'] : 30,
            priority: (typeof t['priority'] === 'string' ? t['priority'] : 'P2'),
            rationale: typeof t['rationale'] === 'string' ? t['rationale'] : '',
        }));
        logger.info({ count: tasks.length, cost: response.cost_usd }, 'task_breaker.success');
        return { tasks, cost_usd: response.cost_usd, latency_ms: Date.now() - start };
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.error({ error: msg }, 'task_breaker.fail');
        // Fallback: single task for the whole content
        return {
            tasks: [{
                    id: 'task_001',
                    title: 'Direct request',
                    description: file_content.slice(0, 500),
                    type: 'unknown',
                    agent_target: 'maestro',
                    dependencies: [],
                    estimated_effort_min: 30,
                    priority: 'P1',
                    rationale: 'Fallback — task_breaker parse failed',
                }],
            cost_usd: 0,
            latency_ms: Date.now() - start,
        };
    }
}
//# sourceMappingURL=task_breaker.js.map