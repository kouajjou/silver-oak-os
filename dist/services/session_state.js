/**
 * Session State - Vision Alex Autonome
 * Persists agent runs in Supabase agent_runs + agent_run_tasks tables.
 * Allows Alex to resume after crash, track progress, manage multi-turn.
 */
import { createClient } from '@supabase/supabase-js';
import { readEnvFile } from '../env.js';
const envVars = readEnvFile(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
const supabaseUrl = process.env['SUPABASE_URL'] ?? envVars['SUPABASE_URL'] ?? '';
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? envVars['SUPABASE_SERVICE_ROLE_KEY'] ?? '';
const supabase = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;
// ─────────────────────────────────────────────────────────
// Run operations
// ─────────────────────────────────────────────────────────
export async function createRun(run) {
    if (!supabase)
        return null;
    const { data, error } = await supabase
        .from('agent_runs')
        .insert(run)
        .select()
        .single();
    if (error)
        return null;
    return data;
}
export async function updateRun(id, updates) {
    if (!supabase)
        return false;
    const { error } = await supabase
        .from('agent_runs')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
    return !error;
}
export async function getRun(id) {
    if (!supabase)
        return null;
    const { data, error } = await supabase
        .from('agent_runs')
        .select('*')
        .eq('id', id)
        .single();
    if (error)
        return null;
    return data;
}
export async function getActiveRuns(user_id) {
    if (!supabase)
        return [];
    const { data, error } = await supabase
        .from('agent_runs')
        .select('*')
        .eq('user_id', user_id)
        .in('status', ['running', 'paused'])
        .order('started_at', { ascending: false });
    if (error)
        return [];
    return (data ?? []);
}
export async function endRun(id, status) {
    if (!supabase)
        return false;
    const { error } = await supabase
        .from('agent_runs')
        .update({
        status,
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    })
        .eq('id', id);
    return !error;
}
// ─────────────────────────────────────────────────────────
// Task operations
// ─────────────────────────────────────────────────────────
export async function createTask(task) {
    if (!supabase)
        return null;
    const { data, error } = await supabase
        .from('agent_run_tasks')
        .insert(task)
        .select()
        .single();
    if (error)
        return null;
    return data;
}
export async function updateTask(id, updates) {
    if (!supabase)
        return false;
    const { error } = await supabase
        .from('agent_run_tasks')
        .update(updates)
        .eq('id', id);
    return !error;
}
export async function getTasksForRun(run_id) {
    if (!supabase)
        return [];
    const { data, error } = await supabase
        .from('agent_run_tasks')
        .select('*')
        .eq('run_id', run_id)
        .order('created_at', { ascending: true });
    if (error)
        return [];
    return (data ?? []);
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
//# sourceMappingURL=session_state.js.map