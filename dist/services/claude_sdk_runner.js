/**
 * Claude SDK Runner — Service centralisé pour tous les agents
 * Fix Architecture — Frontend chat SDK direct (Mark Kashef pattern)
 *
 * Tous les agents (Alex + 5 employees + Maestro discussion) utilisent ce service.
 * SDK Claude Code Pro Max ($0 forfait Karim) — JAMAIS Anthropic API direct.
 *
 * Tmux UNIQUEMENT pour Maestro Mode 1 coding (cli_tmux_dispatcher.ts).
 */
import { query } from "@anthropic-ai/claude-agent-sdk";
import { getModelForAgent } from "../config/agent_models.js";
/**
 * Run agent via SDK Claude Code Pro Max DIRECT (in-process, no tmux)
 * Pattern copie de src/agent.ts (Telegram qui marche [sonnet])
 */
export async function runAgent(opts) {
    const startTime = Date.now();
    const model = getModelForAgent(opts.agentName);
    const sessionId = opts.sessionId ?? ("chat-" + opts.agentName + "-" + Date.now());
    let reply = "";
    for await (const event of query({
        prompt: opts.message,
        options: {
            model,
            ...(opts.sessionId ? { resume: opts.sessionId } : {}),
            ...(opts.agentCwd ? { cwd: opts.agentCwd } : {}),
            allowDangerouslySkipPermissions: true,
            maxTurns: opts.maxTurns ?? 3,
            settingSources: ["project", "user"],
        },
    })) {
        const ev = event;
        // Extract text from result event (pattern alex_orchestrator.ts callProMax)
        if (ev["type"] === "result") {
            reply = ev["result"] ?? "";
        }
        // Also capture partial assistant messages for streaming contexts
        if (ev["type"] === "assistant") {
            const msg = ev["message"];
            if (msg?.["content"] && Array.isArray(msg["content"])) {
                for (const block of msg["content"]) {
                    if (block["type"] === "text" && typeof block["text"] === "string" && !reply) {
                        reply = block["text"];
                    }
                }
            }
        }
    }
    return {
        reply: reply.trim(),
        model,
        agentName: opts.agentName,
        sessionId,
        latencyMs: Date.now() - startTime,
    };
}
/**
 * Streaming version pour SSE (token-by-token via result events)
 */
export async function* runAgentStream(opts) {
    const startTime = Date.now();
    const model = getModelForAgent(opts.agentName);
    const sessionId = opts.sessionId ?? ("chat-" + opts.agentName + "-" + Date.now());
    try {
        for await (const event of query({
            prompt: opts.message,
            options: {
                model,
                ...(opts.sessionId ? { resume: opts.sessionId } : {}),
                ...(opts.agentCwd ? { cwd: opts.agentCwd } : {}),
                allowDangerouslySkipPermissions: true,
                maxTurns: opts.maxTurns ?? 3,
                settingSources: ["project", "user"],
                includePartialMessages: true,
            },
        })) {
            const ev = event;
            if (ev["type"] === "assistant") {
                const msg = ev["message"];
                if (msg?.["content"] && Array.isArray(msg["content"])) {
                    for (const block of msg["content"]) {
                        if (block["type"] === "text" && typeof block["text"] === "string") {
                            yield { type: "token", text: block["text"] };
                        }
                    }
                }
            }
        }
        yield {
            type: "done",
            meta: {
                model,
                agentName: opts.agentName,
                sessionId,
                latencyMs: Date.now() - startTime,
            },
        };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        yield { type: "error", error: msg };
    }
}
//# sourceMappingURL=claude_sdk_runner.js.map