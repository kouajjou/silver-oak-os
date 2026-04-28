-- Migration agent_runs - Vision Alex Autonome
-- Tracks each autonomous Alex execution session

CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  initial_request TEXT NOT NULL,
  initial_file_content TEXT,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'paused')),
  tasks_total INT DEFAULT 0,
  tasks_completed INT DEFAULT 0,
  tasks_failed INT DEFAULT 0,
  tasks_pending INT DEFAULT 0,
  current_iteration INT DEFAULT 0,
  max_iterations INT DEFAULT 20,
  total_cost_usd NUMERIC(10, 6) DEFAULT 0,
  total_latency_ms BIGINT DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_user_id ON agent_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_agent_runs_started_at ON agent_runs(started_at DESC);

ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON agent_runs
  FOR ALL USING (true) WITH CHECK (true);

-- Sub-table for individual task tracking
CREATE TABLE IF NOT EXISTS agent_run_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  title TEXT NOT NULL,
  task_type TEXT,
  agent_target TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  result TEXT,
  cost_usd NUMERIC(10, 6) DEFAULT 0,
  latency_ms INT DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_run_tasks_run_id ON agent_run_tasks(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_run_tasks_status ON agent_run_tasks(status);

ALTER TABLE agent_run_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access tasks" ON agent_run_tasks
  FOR ALL USING (true) WITH CHECK (true);
