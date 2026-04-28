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
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import fs from "fs";

// ── Ensure logs/ directory exists ─────────────────────────────────────────
const LOGS_DIR = path.join(process.cwd(), "logs");
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// ── Custom format for console (human-readable) ────────────────────────────
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length
      ? " " + JSON.stringify(meta)
      : "";
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

// ── JSON format for file transport ────────────────────────────────────────
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// ── Daily rotate file transport ───────────────────────────────────────────
const dailyRotateTransport = new DailyRotateFile({
  dirname: LOGS_DIR,
  filename: "%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d",   // keep 14 days
  format: fileFormat,
  level: "debug",
});

// ── Winston logger instance ───────────────────────────────────────────────
const logger = winston.createLogger({
  level: process.env["LOG_LEVEL"] ?? "info",
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
      silent: process.env["NODE_ENV"] === "test",
    }),
    dailyRotateTransport,
  ],
  // Prevent winston from exiting on uncaught exceptions
  exitOnError: false,
});

// ── Structured event helper for Maestro orchestration ────────────────────
export interface MaestroEvent {
  category: string;   // e.g. "maestro", "alex", "budget", "dispatch"
  action: string;     // e.g. "dispatch", "skip", "approve", "hitl"
  data?: Record<string, unknown>;
}

/**
 * Log a structured Maestro event (always at "info" level).
 * Produces a clean JSON entry in the daily log file.
 */
export function logEvent(
  category: string,
  action: string,
  data?: Record<string, unknown>
): void {
  logger.info(`${category}.${action}`, {
    event: { category, action, ...(data ?? {}) },
  });
}

export default logger;
