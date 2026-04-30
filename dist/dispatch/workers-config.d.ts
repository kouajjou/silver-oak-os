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
export declare const WORKERS: WorkerConfig[];
export declare function getWorker(session: string): WorkerConfig | undefined;
export declare function getActiveWorkersByTier(tier: string): WorkerConfig[];
export declare function getCheapestWorkerForUseCase(useCase: string): WorkerConfig | undefined;
export declare function getBannedWorkers(): WorkerConfig[];
//# sourceMappingURL=workers-config.d.ts.map