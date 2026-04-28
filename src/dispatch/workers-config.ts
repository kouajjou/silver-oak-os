/**
 * Worker tier configuration for Maestro dispatch routing
 * gap-006: Define cheap T3 workers for simple bash/scripting tasks
 */

export interface WorkerConfig {
  session: string;
  tier: 'T1' | 'T1.5' | 'T2' | 'T3';
  model: string;
  cost_per_million_in: number;
  cost_per_million_out: number;
  use_cases: string[];
  banned: boolean;
}

export const WORKERS: WorkerConfig[] = [
  // T1 Premium (Pro Max forfait flat)
  { session: 'claude-code', tier: 'T1', model: 'sonnet-4.6', cost_per_million_in: 0, cost_per_million_out: 0, use_cases: ['architecture', 'review', 'orchestration'], banned: false },
  { session: 'claude-backend', tier: 'T1', model: 'sonnet-4.6', cost_per_million_in: 0, cost_per_million_out: 0, use_cases: ['backend code', 'TS refactor'], banned: false },
  { session: 'claude-frontend', tier: 'T1', model: 'sonnet-4.6', cost_per_million_in: 0, cost_per_million_out: 0, use_cases: ['frontend code', 'docs'], banned: false },
  { session: 'opus', tier: 'T1', model: 'opus-4.7', cost_per_million_in: 0, cost_per_million_out: 0, use_cases: ['critical decisions only with USINE_OPUS_ALLOWED override'], banned: false },

  // T1.5 Reasoning
  { session: 'deepseek-r1-1', tier: 'T1.5', model: 'deepseek-r1', cost_per_million_in: 0.07, cost_per_million_out: 0.11, use_cases: ['complex reasoning', 'planning'], banned: false },
  { session: 'deepseek-r1-2', tier: 'T1.5', model: 'deepseek-r1', cost_per_million_in: 0.07, cost_per_million_out: 0.11, use_cases: ['complex reasoning', 'planning'], banned: false },

  // T2 Audit
  { session: 'aider-deepseek-1', tier: 'T2', model: 'aider+deepseek', cost_per_million_in: 0.14, cost_per_million_out: 0.28, use_cases: ['code audit', 'fix mecanique', 'bash simple', 'file ops', 'curl tests'], banned: false }, // T2.5 — PREMIER CHOIX bash cheap
  { session: 'aider-deepseek-2', tier: 'T2', model: 'aider+deepseek', cost_per_million_in: 0.14, cost_per_million_out: 0.28, use_cases: ['code audit', 'bash simple', 'file ops'], banned: false }, // T2.5 bash cheap
  { session: 'aider-deepseek-3', tier: 'T2', model: 'aider+deepseek', cost_per_million_in: 0.14, cost_per_million_out: 0.28, use_cases: ['code audit', 'bash simple'], banned: false }, // T2.5 bash cheap
  { session: 'aider-gemini-1', tier: 'T2', model: 'aider+gemini', cost_per_million_in: 0, cost_per_million_out: 0, use_cases: [], banned: true },
  { session: 'aider-gemini-2', tier: 'T2', model: 'aider+gemini', cost_per_million_in: 0, cost_per_million_out: 0, use_cases: [], banned: true },
  { session: 'aider-gemini-3', tier: 'T2', model: 'aider+gemini', cost_per_million_in: 0, cost_per_million_out: 0, use_cases: [], banned: true },

  // T3 Bash (full models)
  { session: 'gpt4o-1', tier: 'T3', model: 'gpt-4o', cost_per_million_in: 2.5, cost_per_million_out: 10, use_cases: ['bash simple', 'file ops', 'curl tests'], banned: true }, // BANNED: $2.94-8.70 incident — use aider-deepseek-* instead
  { session: 'gpt4o-2', tier: 'T3', model: 'gpt-4o', cost_per_million_in: 2.5, cost_per_million_out: 10, use_cases: ['bash simple', 'file ops'], banned: true }, // BANNED: cost incident 2026-04-28
  { session: 'grok-1', tier: 'T3', model: 'grok-2', cost_per_million_in: 5, cost_per_million_out: 15, use_cases: ['bash', 'web research'], banned: false },
  { session: 'grok-2', tier: 'T3', model: 'grok-2', cost_per_million_in: 5, cost_per_million_out: 15, use_cases: ['bash'], banned: false },

  // Audit Gemini
  { session: 'audit-gemini-1', tier: 'T2', model: 'gemini-1.5-pro', cost_per_million_in: 1.25, cost_per_million_out: 5, use_cases: ['cross-LLM judge', 'audit indep'], banned: false },
  { session: 'audit-gemini-2', tier: 'T2', model: 'gemini-1.5-pro', cost_per_million_in: 1.25, cost_per_million_out: 5, use_cases: ['cross-LLM judge'], banned: false },
  { session: 'audit-gemini-3', tier: 'T2', model: 'gemini-1.5-pro', cost_per_million_in: 1.25, cost_per_million_out: 5, use_cases: ['cross-LLM judge'], banned: false },
];

export function getWorker(session: string): WorkerConfig | undefined {
  return WORKERS.find(w => w.session === session);
}

export function getActiveWorkersByTier(tier: string): WorkerConfig[] {
  return WORKERS.filter(w => w.tier === tier && !w.banned);
}

export function getCheapestWorkerForUseCase(useCase: string): WorkerConfig | undefined {
  const candidates = WORKERS
    .filter(w => !w.banned)
    .filter(w => w.use_cases.some(uc => uc.toLowerCase().includes(useCase.toLowerCase())))
    .sort((a, b) => (a.cost_per_million_in + a.cost_per_million_out) - (b.cost_per_million_in + b.cost_per_million_out));
  return candidates[0];
}

export function getBannedWorkers(): WorkerConfig[] {
  return WORKERS.filter(w => w.banned);
}
