export interface HealthCheckResult {
    status: string;
    error: string;
}
/**
 * Run a health check command for a single skill.
 * Returns { status: 'healthy', error: '' } on exit 0,
 * { status: 'unhealthy', error: stderr } on non-zero exit,
 * { status: 'timeout', error: 'Health check timed out' } on timeout.
 *
 * Stores the result in the skill_health table.
 */
export declare function runSkillHealthCheck(skillId: string, command: string): Promise<HealthCheckResult>;
/**
 * Run health checks for all skills that have a healthCheck command defined.
 * Results are stored in the DB via upsertSkillHealth.
 */
export declare function runAllHealthChecks(skills: Array<{
    id: string;
    healthCheck?: string;
}>): Promise<void>;
//# sourceMappingURL=skill-health.d.ts.map