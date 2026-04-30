/**
 * Security module for ClaudeClaw.
 *
 * Layers:
 * 1. PIN lock + idle auto-lock: session must be unlocked before commands execute
 * 2. Emergency kill switch: a phrase that shuts down the process immediately
 * 3. Audit logging: every action is recorded to SQLite + structured logger
 *
 * All layers are optional and zero-friction when not configured.
 */
export declare function initSecurity(opts: {
    pinHash?: string;
    idleLockMinutes?: number;
    killPhrase?: string;
}): void;
/** Whether PIN lock is configured. */
export declare function isSecurityEnabled(): boolean;
export declare function isLocked(): boolean;
export declare function lock(): void;
export declare function unlock(pin: string): boolean;
/** Record activity to reset idle timeout. */
export declare function touchActivity(): void;
/**
 * Hash a PIN with a random salt. Returns "salt:hash".
 * Used during setup to generate the value stored in .env.
 */
export declare function hashPin(pin: string): string;
/** Check if the message is the emergency kill phrase. */
export declare function checkKillPhrase(message: string): boolean;
/**
 * Execute the emergency shutdown.
 * Stops all ClaudeClaw services and force-exits after a brief timeout.
 */
export declare function executeEmergencyKill(): void;
export type AuditAction = 'message' | 'command' | 'delegation' | 'unlock' | 'lock' | 'kill' | 'blocked';
export interface AuditEntry {
    agentId: string;
    chatId: string;
    action: AuditAction;
    detail: string;
    blocked: boolean;
}
export declare function setAuditCallback(cb: (entry: AuditEntry) => void): void;
export declare function audit(entry: AuditEntry): void;
export declare function getSecurityStatus(): {
    pinEnabled: boolean;
    locked: boolean;
    idleLockMinutes: number;
    killPhraseEnabled: boolean;
    lastActivity: number;
};
//# sourceMappingURL=security.d.ts.map