/**
 * Agent Voice Bridge
 *
 * Lightweight CLI script that the War Room Pipecat server calls to invoke
 * a ClaudeClaw agent via the Claude Code SDK and return the text response.
 *
 * Usage: node dist/agent-voice-bridge.js --agent research --message "What did you find?"
 *
 * Outputs JSON to stdout: {"response": "...", "usage": {...}, "error": null}
 *
 * The Pipecat server spawns this as a subprocess for each agent turn,
 * reads the JSON response, and pipes the text to TTS.
 */
export {};
//# sourceMappingURL=agent-voice-bridge.d.ts.map