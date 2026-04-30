/**
 * Centralised logger for Silver Oak OS — SOP V26.4
 *
 * Transports:
 *   - Console  : pretty format (colorized, dev-friendly)
 *   - File     : JSON structured, daily rotation → logs/{date}.log
 *
 * Usage:
 *   import logger, { logEvent } from "./services/logger.js";
 *   logger.info("Agent started", { agent: "alex" });
 *   logEvent("maestro", "dispatch", { task: "gap-010", worker: "aider-deepseek-1" });
 */
import winston from "winston";
declare const logger: winston.Logger;
export interface MaestroEvent {
    category: string;
    action: string;
    data?: Record<string, unknown>;
}
/**
 * Log a structured Maestro event (always at "info" level).
 * Produces a clean JSON entry in the daily log file.
 */
export declare function logEvent(category: string, action: string, data?: Record<string, unknown>): void;
export default logger;
//# sourceMappingURL=logger.d.ts.map