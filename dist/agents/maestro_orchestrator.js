/**
 * Maestro Orchestrator -- Senior PhD Developer Agent
 * Receives technical tasks from Alex, dispatches to Mode 1 (tmux Pro Max) or Mode 2 (API).
 * Symmetric to alex_orchestrator.ts but for development tasks.
 * Phase 5B.2 -- Created 2026-04-29
 */
import fs from 'fs';
import path from 'path';
import { dispatchToMaestro } from './maestro_dispatcher.js';
import { logAgentRun } from '../services/agent_run_logger.js';
import { logger } from '../logger.js';
// ── SOP file (optional, graceful fallback) ────────────────────────────────────
let MAESTRO_SOP = '';
try {
    MAESTRO_SOP = fs.readFileSync(path.join(process.cwd(), 'agents/maestro/CLAUDE.md'), 'utf-8');
}
catch (e) {
    logger.warn('[MAESTRO_ORCH] SOP V26 file not found, using empty SOP');
}
function classifyTaskComplexity(task) {
    if (task.length < 150) {
        return { mode: 'mode_2_api', confidence: 0.9, reasoning: 'short task -> mode_2' };
    }
    const complexKeywords = [
        'refactor', 'architecture', 'multi-file', 'integration',
        'migrate', 'design pattern', 'rewrite', 'full implementation',
    ];
    const lower = task.toLowerCase();
    for (const kw of complexKeywords) {
        if (lower.includes(kw)) {
            return { mode: 'mode_1_tmux', confidence: 0.85, reasoning: 'complex keyword: ' + kw };
        }
    }
    return { mode: 'mode_2_api', confidence: 0.7, reasoning: 'default mode_2' };
}
// ── Optional helpers (dynamic import, graceful) ───────────────────────────────
async function breakDownTaskSafe(task) {
    try {
        const tb = await import('./task_breaker.js').catch(() => null);
        if (tb && typeof tb.breakDownTasks === 'function') {
            const result = await tb.breakDownTasks(task, 'maestro-orchestrator');
            if (result && Array.isArray(result.tasks)) {
                return result.tasks.map((t) => t.description || t.title || String(t));
            }
        }
    }
    catch (e) {
        logger.warn('[MAESTRO_ORCH] breakDownTasks unavailable, single-task fallback');
    }
    return [task];
}
async function judgeResultSafe(task, result) {
    try {
        const lj = await import('../services/llm_judge.js').catch(() => null);
        if (lj && typeof lj.judge === 'function') {
            const judged = await lj.judge({
                task_description: task,
                expected_output: 'Detailed technical implementation plan with specific steps and code guidance',
                actual_output: result,
                task_type: 'technical',
            });
            if (judged && judged.grade) {
                const gradeMap = { A: 1.0, B: 0.8, C: 0.6, D: 0.4, F: 0.0 };
                return gradeMap[judged.grade] ?? undefined;
            }
        }
    }
    catch (e) {
        logger.warn('[MAESTRO_ORCH] judgeResult unavailable, skipping judge');
    }
    return undefined;
}
// ── Main export ───────────────────────────────────────────────────────────────
export async function maestroHandle(task, context = {}) {
    const startTime = Date.now();
    const taskId = 'maestro_' + startTime + '_' + Math.random().toString(36).slice(2, 8);
    logger.info({ taskId, len: task.length, context }, '[MAESTRO_ORCH] received task');
    try {
        // 1. Optionally break down task
        const subtasks = await breakDownTaskSafe(task);
        if (subtasks.length > 1) {
            logger.info({ count: subtasks.length }, '[MAESTRO_ORCH] task split into subtasks');
        }
        // 2. Classify complexity -> select mode
        const classification = context.forceMode
            ? { mode: context.forceMode, confidence: 1.0, reasoning: 'forced by context' }
            : classifyTaskComplexity(task);
        logger.info({ mode: classification.mode, confidence: classification.confidence, reason: classification.reasoning }, '[MAESTRO_ORCH] mode selected');
        // 3. Build MaestroTask for dispatcher
        const dispatchPayload = {
            task_description: task,
            user_id: context.userId || 'maestro-orchestrator',
            mode: classification.mode,
            max_tokens: 800,
        };
        if (context.preferredProvider && context.preferredProvider !== 'gemini' && context.preferredProvider !== 'grok' && context.preferredProvider !== 'mistral') {
            dispatchPayload.preferred_provider = context.preferredProvider;
        }
        // 4. Dispatch
        const dispatchResult = await dispatchToMaestro(dispatchPayload);
        logger.info({ success: dispatchResult.success, provider: dispatchResult.provider_used, mode: dispatchResult.mode_used }, '[MAESTRO_ORCH] dispatch result');
        // 5. Judge result quality (optional, non-blocking)
        const judgeScore = dispatchResult.success
            ? await judgeResultSafe(task, dispatchResult.result || '')
            : undefined;
        // 6. Log to DB
        const dbMode = (classification.mode === 'mode_1_tmux' ? 'mode_1' : 'mode_2');
        await logAgentRun({
            agent: 'maestro',
            taskId,
            task,
            mode: dbMode,
            provider: dispatchResult.provider_used || undefined,
            success: dispatchResult.success,
            judgeScore,
            durationMs: Date.now() - startTime,
            parentTaskId: context.parentTaskId,
        });
        return {
            success: dispatchResult.success,
            result: dispatchResult.result || '',
            mode: classification.mode,
            provider: dispatchResult.provider_used,
            durationMs: Date.now() - startTime,
            judgeScore,
            reasoning: classification.reasoning,
            taskId,
            subtasks: subtasks.length > 1 ? subtasks : undefined,
        };
    }
    catch (error) {
        const errMsg = error.message || String(error);
        logger.error({ taskId, error: errMsg }, '[MAESTRO_ORCH] error');
        await logAgentRun({
            agent: 'maestro',
            taskId,
            task,
            mode: 'failed',
            success: false,
            error: errMsg,
            durationMs: Date.now() - startTime,
            parentTaskId: context.parentTaskId,
        }).catch(() => { }); // non-blocking
        return {
            success: false,
            result: 'Maestro error: ' + errMsg,
            mode: 'failed',
            durationMs: Date.now() - startTime,
            taskId,
        };
    }
}
export default maestroHandle;
//# sourceMappingURL=maestro_orchestrator.js.map