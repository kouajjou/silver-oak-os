/**
 * backlog-parser.ts — BACKLOG.md autonomous parser for Maestro
 *
 * Reads a BACKLOG.md file and returns a structured TaskWave ready for dispatch.
 * Follows the BACKLOG_TEMPLATE.md format.
 *
 * Usage:
 *   const wave = parseBacklog(fs.readFileSync('BACKLOG.md', 'utf-8'));
 *   // wave.tasks are ordered respecting dependencies
 *   // wave.metadata contains budget cap, HITL reactivity, etc.
 */
export type AutonomyLevel = 'AUTO' | 'NOTIFY' | 'HITL';
export interface BacklogTask {
    id: string;
    title: string;
    autonomy: AutonomyLevel;
    description: string;
    acceptanceCriteria: string;
    suggestedWorker?: string;
    budgetCapUsd?: number;
    featureBranch?: string;
    tests?: string;
    notes?: string;
    /** IDs this task must wait for before starting */
    dependsOn: string[];
    /** Resolved at runtime */
    status: 'pending' | 'in_progress' | 'done' | 'failed' | 'skipped' | 'blocked_human';
    failCount: number;
}
export interface BacklogMetadata {
    author: string;
    date: string;
    budgetCapUsd: number;
    durationMaxH: number;
    hitlReactivity: 'haute' | 'normale' | 'faible';
    maxParallelism: number;
}
export interface TaskWave {
    waveId: string;
    metadata: BacklogMetadata;
    tasks: BacklogTask[];
    /** Raw dependency rules as parsed */
    dependencyRules: string[];
}
/**
 * Parse a BACKLOG.md string into a structured TaskWave.
 *
 * @param content  Raw markdown content of the BACKLOG.md file
 * @returns        Structured TaskWave with tasks in dependency order
 */
export declare function parseBacklog(content: string): TaskWave;
/**
 * Returns tasks that are ready to execute (pending + all deps done).
 */
export declare function getReadyTasks(wave: TaskWave): BacklogTask[];
/**
 * Apply anti-churn: mark task as skipped after 2 fails.
 * Returns true if the task was skipped.
 */
export declare function applyAntiChurn(task: BacklogTask): boolean;
/**
 * Build the full prompt for a worker given a task.
 * Includes AGENTS.md context, task details, and mandatory SOP rules.
 */
export declare function buildWorkerPrompt(task: BacklogTask, agentsMd: string, waveId: string): string;
//# sourceMappingURL=backlog-parser.d.ts.map