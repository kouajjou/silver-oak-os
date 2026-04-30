/**
 * Claude SDK Runner — Service centralisé pour tous les agents
 * Fix Architecture — Frontend chat SDK direct (Mark Kashef pattern)
 *
 * Tous les agents (Alex + 5 employees + Maestro discussion) utilisent ce service.
 * SDK Claude Code Pro Max ($0 forfait Karim) — JAMAIS Anthropic API direct.
 *
 * Tmux UNIQUEMENT pour Maestro Mode 1 coding (cli_tmux_dispatcher.ts).
 */
import type { AgentName, ClaudeModel } from "../config/agent_models.js";
export interface RunAgentOptions {
    agentName: AgentName;
    message: string;
    sessionId?: string;
    agentCwd?: string;
    maxTurns?: number;
}
export interface RunAgentResult {
    reply: string;
    model: ClaudeModel;
    agentName: AgentName;
    sessionId: string;
    latencyMs: number;
}
/**
 * Run agent via SDK Claude Code Pro Max DIRECT (in-process, no tmux)
 * Pattern copie de src/agent.ts (Telegram qui marche [sonnet])
 */
export declare function runAgent(opts: RunAgentOptions): Promise<RunAgentResult>;
/**
 * Streaming version pour SSE (token-by-token via result events)
 */
export declare function runAgentStream(opts: RunAgentOptions): AsyncGenerator<{
    type: "token" | "done" | "error";
    text?: string;
    error?: string;
    meta?: {
        model: ClaudeModel;
        agentName: AgentName;
        sessionId: string;
        latencyMs: number;
    };
}>;
//# sourceMappingURL=claude_sdk_runner.d.ts.map