/**
 * Session State - Vision Alex Autonome
 * Persists agent runs in Supabase agent_runs + agent_run_tasks tables.
 * Allows Alex to resume after crash, track progress, manage multi-turn.
 */

import { createClient } from '@supabase/supabase-js';

// Graceful import: logger may not be wired yet
let logger: { info: (...a: unknown[]) => void; warn: (...a: unknown[]) => void; error: (...a: unknown[]) => void } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  logger = require('./logger').logger ?? require('./logger').default;
} catch {
  // logger optional
}

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export type RunStatus = 'running' | 'completed' | 'failed' | 'paused';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface AgentRun {
  id?: string;
  user_id: string;
  initial_request: string;
  initial_file_content?: string;
  status: RunStatus;
  tasks_total?: number;
  tasks_completed?: number;
  tasks_failed?: number;
  tasks_pending?: number;
  current_iteration?: number;
  max_iterations?: number;
  total_cost_usd?: number;
  total_latency_ms?: number;
  metadata?: Record<string, unknown>;
  started_at?: string;
  updated_at?: string;
  ended_at?: string | null;
}

export interface AgentRunTask {
  id?: string;
  run_id: string;
  task_id: string;
  title: string;
  task_type?: string;
  agent_target?: string;
  status: TaskStatus;
  result?: string;
  cost_usd?: number;
  latency_ms?: number;
  started_at?: string | null;
  ended_at?: string | null;
  created_at?: string;
}

// ─────────────────────────────────────────────────────────
// Run operations
// ─────────────────────────────────────────────────────────

export async function createRun(run: Omit<AgentRun, 'id'>): Promise<AgentRun | null> {
  if (!supabase) {
    logger?.warn('session_state: no supabase client — run not persisted');
    return null;
  }

  const { data, error } = await supabase
    .from('agent_runs')
    .insert(run)
    .select()
    .single();

  if (error) {
    logger?.error('session_state.createRun failed', { error: error.message });
    return null;
  }

  logger?.info('session_state.run_created', { run_id: (data as AgentRun).id });
  return data as AgentRun;
}

export async function updateRun(id: string, updates: Partial<AgentRun>): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('agent_runs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    logger?.error('session_state.updateRun failed', { id, error: error.message });
    return false;
  }
  return true;
}

export async function getRun(id: string): Promise<AgentRun | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('agent_runs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    logger?.error('session_state.getRun failed', { id, error: error.message });
    return null;
  }
  return data as AgentRun;
}

export async function getActiveRuns(user_id: string): Promise<AgentRun[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('agent_runs')
    .select('*')
    .eq('user_id', user_id)
    .in('status', ['running', 'paused'])
    .order('started_at', { ascending: false });

  if (error) {
    logger?.error('session_state.getActiveRuns failed', { user_id, error: error.message });
    return [];
  }
  return (data ?? []) as AgentRun[];
}

export async function endRun(id: string, status: Exclude<RunStatus, 'running' | 'paused'>): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('agent_runs')
    .update({
      status,
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    logger?.error('session_state.endRun failed', { id, error: error.message });
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────
// Task operations
// ─────────────────────────────────────────────────────────

export async function createTask(task: Omit<AgentRunTask, 'id'>): Promise<AgentRunTask | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('agent_run_tasks')
    .insert(task)
    .select()
    .single();

  if (error) {
    logger?.error('session_state.createTask failed', { error: error.message });
    return null;
  }
  return data as AgentRunTask;
}

export async function updateTask(id: string, updates: Partial<AgentRunTask>): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('agent_run_tasks')
    .update(updates)
    .eq('id', id);

  if (error) {
    logger?.error('session_state.updateTask failed', { id, error: error.message });
    return false;
  }
  return true;
}

export async function getTasksForRun(run_id: string): Promise<AgentRunTask[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('agent_run_tasks')
    .select('*')
    .eq('run_id', run_id)
    .order('created_at', { ascending: true });

  if (error) return [];
  return (data ?? []) as AgentRunTask[];
}

export default {
  createRun,
  updateRun,
  getRun,
  getActiveRuns,
  endRun,
  createTask,
  updateTask,
  getTasksForRun,
};
