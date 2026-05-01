/**
 * Agent Watchdog (PhD fix 2026-05-01 - Phase 2)
 *
 * Surveille les agents systemd-user (com.claudeclaw.agent-*) toutes les 60s.
 * Detecte si un agent restart >3 fois en 5 min = crash loop.
 * Envoie une alerte Telegram + desactive l'agent automatiquement.
 *
 * Probleme initial : Sara/Leo/Marco/Nina avaient des tokens Telegram invalides
 * et crashaient en boucle (systemd auto-restart) sans aucune alerte.
 * Karim ne savait pas qu'ils ne tournaient pas.
 *
 * Architecture :
 *   - check loop toutes les 60s
 *   - lit `systemctl --user status` pour chaque agent
 *   - parse "NRestarts=N" du systemd
 *   - si delta NRestarts >3 en window 5min -> CRASH LOOP
 *   - alerte Telegram + systemctl stop + log
 *
 * Activation : import puis startAgentWatchdog() dans index.ts
 */
import { execSync } from "child_process";
import os from "os";
import { logger } from "../logger.js";
import { TELEGRAM_BOT_TOKEN, ALLOWED_CHAT_ID } from "../config.js";

const CHECK_INTERVAL_MS = 60_000; // 60s
const CRASH_THRESHOLD = 3; // 3 restarts en window
const WINDOW_MINUTES = 5; // 5 min

interface AgentRestartHistory {
  agent_id: string;
  last_check: number;
  restarts_window: { ts: number; n_restarts: number }[];
  alerted: boolean;
}

const agentHistory = new Map<string, AgentRestartHistory>();

// Env helpers ────────────────────────────────────────────────
function getSystemdEnv(): NodeJS.ProcessEnv {
  const uid = process.getuid?.() ?? 1000;
  return {
    ...process.env,
    XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR || `/run/user/${uid}`,
    DBUS_SESSION_BUS_ADDRESS:
      process.env.DBUS_SESSION_BUS_ADDRESS || `unix:path=/run/user/${uid}/bus`,
  };
}

// Read systemd state ─────────────────────────────────────────
interface SystemdAgentState {
  agent_id: string;
  active: boolean;
  n_restarts: number;
  sub_state: string;
  load_state: string;
}

function readSystemdAgentState(agentId: string): SystemdAgentState | null {
  if (os.platform() !== "linux") return null;
  const serviceName = `com.claudeclaw.agent-${agentId}`;
  try {
    const output = execSync(
      `systemctl --user show "${serviceName}" --property=ActiveState,SubState,LoadState,NRestarts`,
      { encoding: "utf-8", env: getSystemdEnv(), stdio: "pipe" }
    );
    const props: Record<string, string> = {};
    output.split("\n").forEach((line) => {
      const [k, v] = line.split("=");
      if (k && v !== undefined) props[k] = v;
    });
    if (props.LoadState !== "loaded") return null;
    return {
      agent_id: agentId,
      active: props.ActiveState === "active",
      n_restarts: parseInt(props.NRestarts ?? "0", 10),
      sub_state: props.SubState ?? "unknown",
      load_state: props.LoadState ?? "unknown",
    };
  } catch {
    return null;
  }
}

// Stop agent on crash loop detection ─────────────────────────
function stopAgent(agentId: string): boolean {
  const serviceName = `com.claudeclaw.agent-${agentId}`;
  try {
    execSync(`systemctl --user stop "${serviceName}"`, {
      env: getSystemdEnv(),
      stdio: "pipe",
    });
    execSync(`systemctl --user disable "${serviceName}"`, {
      env: getSystemdEnv(),
      stdio: "pipe",
    });
    return true;
  } catch (err) {
    logger.error({ agentId, err }, "[watchdog] Failed to stop crash-looping agent");
    return false;
  }
}

// Telegram alert ─────────────────────────────────────────────
async function sendCrashAlert(
  agentId: string,
  restartsCount: number,
  windowMin: number
): Promise<void> {
  const token = TELEGRAM_BOT_TOKEN;
  const chatId = ALLOWED_CHAT_ID;
  if (!token || !chatId) {
    logger.warn(
      { agentId },
      "[watchdog] CRASH LOOP detected but TELEGRAM_BOT_TOKEN or ALLOWED_CHAT_ID missing"
    );
    return;
  }

  const text =
    `🚨 *CRASH LOOP* — agent \`${agentId}\`\n` +
    `${restartsCount} restarts en ${windowMin} min\n` +
    `→ Agent stoppé et désactivé automatiquement\n` +
    `→ Vérifier logs : \`journalctl --user -u com.claudeclaw.agent-${agentId} -n 50\`\n` +
    `→ Cause probable : token Telegram invalide ou config cassée`;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });
  } catch (err) {
    logger.error({ agentId, err }, "[watchdog] Failed to send Telegram alert");
  }
}

// Detect crash loop ──────────────────────────────────────────
function checkAgent(agentId: string): void {
  const state = readSystemdAgentState(agentId);
  if (!state) return; // not loaded, skip silently

  const now = Date.now();
  const history = agentHistory.get(agentId) ?? {
    agent_id: agentId,
    last_check: 0,
    restarts_window: [],
    alerted: false,
  };

  // Add current check
  history.restarts_window.push({ ts: now, n_restarts: state.n_restarts });
  history.last_check = now;

  // Keep only entries within window
  const cutoff = now - WINDOW_MINUTES * 60 * 1000;
  history.restarts_window = history.restarts_window.filter((e) => e.ts >= cutoff);

  // Compute restart delta within window
  if (history.restarts_window.length >= 2) {
    const oldest = history.restarts_window[0];
    const latest = history.restarts_window[history.restarts_window.length - 1];
    const restartDelta = latest.n_restarts - oldest.n_restarts;

    if (restartDelta >= CRASH_THRESHOLD && !history.alerted) {
      logger.error(
        { agentId, restartDelta, window: WINDOW_MINUTES },
        "[watchdog] CRASH LOOP DETECTED — stopping agent"
      );

      // Stop + disable + alert
      const stopped = stopAgent(agentId);
      sendCrashAlert(agentId, restartDelta, WINDOW_MINUTES).catch(() => {
        // non-blocking
      });
      history.alerted = true;
      logger.info({ agentId, stopped }, "[watchdog] Crash loop handled");
    }
  }

  // Reset alerted flag if agent has been stable for full window
  if (
    history.alerted &&
    history.restarts_window.length >= 2 &&
    history.restarts_window[history.restarts_window.length - 1].n_restarts ===
      history.restarts_window[0].n_restarts
  ) {
    history.alerted = false;
  }

  agentHistory.set(agentId, history);
}

// List active agents ─────────────────────────────────────────
function listSystemdAgents(): string[] {
  if (os.platform() !== "linux") return [];
  try {
    const output = execSync(
      `systemctl --user list-units 'com.claudeclaw.agent-*' --no-pager --plain --no-legend`,
      { encoding: "utf-8", env: getSystemdEnv(), stdio: "pipe" }
    );
    const agents: string[] = [];
    output.split("\n").forEach((line) => {
      const match = line.match(/com\.claudeclaw\.agent-([a-z0-9_-]+)\.service/);
      if (match && match[1]) agents.push(match[1]);
    });
    return agents;
  } catch {
    return [];
  }
}

// Main loop ──────────────────────────────────────────────────
let watchdogInterval: NodeJS.Timeout | null = null;

export function startAgentWatchdog(): void {
  if (os.platform() !== "linux") {
    logger.info("[watchdog] Skipped — not on linux");
    return;
  }
  if (watchdogInterval) {
    logger.warn("[watchdog] Already running");
    return;
  }

  logger.info(
    { interval_ms: CHECK_INTERVAL_MS, threshold: CRASH_THRESHOLD, window_min: WINDOW_MINUTES },
    "[watchdog] Started"
  );

  watchdogInterval = setInterval(() => {
    const agents = listSystemdAgents();
    for (const agentId of agents) {
      checkAgent(agentId);
    }
  }, CHECK_INTERVAL_MS);
}

export function stopAgentWatchdog(): void {
  if (watchdogInterval) {
    clearInterval(watchdogInterval);
    watchdogInterval = null;
    logger.info("[watchdog] Stopped");
  }
}

// Stats accessor for dashboard if needed
export function getWatchdogStats(): {
  monitored_agents: number;
  histories: AgentRestartHistory[];
} {
  return {
    monitored_agents: agentHistory.size,
    histories: Array.from(agentHistory.values()),
  };
}
