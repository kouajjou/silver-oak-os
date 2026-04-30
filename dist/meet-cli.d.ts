#!/usr/bin/env node
/**
 * ClaudeClaw Meet CLI
 *
 * Wraps the Pika pikastream-video-meeting skill so agents can send
 * themselves (or another agent) into a Google Meet / Zoom call as a
 * real-time AI avatar. Resolves each agent's avatar from warroom/avatars
 * and their voice_id / bot name from agent.yaml.
 *
 * Usage:
 *   node dist/meet-cli.js join --agent main --meet-url <url> [--brief <file>] [--bot-name <name>]
 *   node dist/meet-cli.js leave --session-id <id>
 *   node dist/meet-cli.js list [--active]
 *   node dist/meet-cli.js show --session-id <id>
 *
 * On join success, the CLI prints JSON:
 *   {"ok": true, "session_id": "...", "agent": "main", "meet_url": "...", "status": "live"}
 *
 * On join failure:
 *   {"ok": false, "error": "..."}
 *
 * Requires PIKA_DEV_KEY in the environment (or project .env).
 * Spawns the vendored Python script at skills/pikastream-video-meeting/scripts/pikastreaming_videomeeting.py
 * using the warroom venv's Python interpreter (the only venv we know has
 * requests installed).
 */
export {};
//# sourceMappingURL=meet-cli.d.ts.map