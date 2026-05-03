/**
 * Agent Run Logger -- DB tracking for Alex/Maestro orchestration
 * Phase 5B.2 -- Created 2026-04-29
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env['SUPABASE_URL'] || '';
const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] || process.env['SUPABASE_ANON_KEY'] || '';

let supabase: any = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    console.warn('[AGENT_RUN_LOGGER] Supabase init failed, console-only logs');
  }
}

export interface AgentRunLog {
  agent: 'alex' | 'maestro' | 'sara' | 'leo' | 'marco' | 'nina';
  taskId: string;
  task: string;
  mode: 'mode_1' | 'mode_2' | 'mode_3' | 'failed';
  provider?: string;
  success: boolean;
  judgeScore?: number;
  durationMs: number;
  error?: string;
  parentTaskId?: string;
}

export async function logAgentRun(log: AgentRunLog): Promise<void> {
  // Console toujours
  const status = log.success ? 'OK' : 'FAIL';
  const parts = [
    '[AGENT_RUN]',
    log.agent,
    log.taskId,
    log.mode,
    status,
    String(log.durationMs) + 'ms',
  ];
  if (log.provider) parts.push('provider=' + log.provider);
  if (log.judgeScore !== undefined) parts.push('judge=' + log.judgeScore);
  console.log(parts.join(' | '));

  // Persist DB si Supabase OK
  if (!supabase) return;

  try {
    const { error } = await supabase.from('agent_runs').insert({
      agent: log.agent,
      task_id: log.taskId,
      task_text: log.task.slice(0, 4000),
      mode: log.mode,
      provider: log.provider || null,
      success: log.success,
      judge_score: log.judgeScore || null,
      duration_ms: log.durationMs,
      error_message: log.error || null,
      parent_task_id: log.parentTaskId || null,
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('[AGENT_RUN_LOGGER] DB insert failed: ' + error.message);
    }
  } catch (e: any) {
    console.warn('[AGENT_RUN_LOGGER] DB error: ' + (e.message || String(e)));
  }
}
