/**
 * Build a structured memory context string to prepend to the user's message.
 *
 * Three-layer retrieval:
 *   Layer 1: FTS5 keyword search on summary + raw_text + entities + topics (top 5)
 *   Layer 2: Recent high-importance memories (importance >= 0.5, top 5 by accessed_at)
 *   Layer 3: Relevant consolidation insights
 *
 * Deduplicates across layers. Returns formatted context with structure.
 */
export interface MemoryContextResult {
    contextText: string;
    surfacedMemoryIds: number[];
    surfacedMemorySummaries: Map<number, string>;
}
export declare function buildMemoryContext(chatId: string, userMessage: string, agentId?: string): Promise<MemoryContextResult>;
/**
 * Process a conversation turn: log it and fire async memory extraction.
 * Called AFTER Claude responds, with both user message and Claude's response.
 *
 * The conversation log is written synchronously (for /respin support).
 * Memory extraction via Gemini is fire-and-forget (never blocks the response).
 */
export declare function saveConversationTurn(chatId: string, userMessage: string, claudeResponse: string, sessionId?: string, agentId?: string): void;
/**
 * Run the daily decay sweep. Call once on startup and every 24h.
 * Also prunes old conversation_log entries to prevent unbounded growth.
 *
 * MESSAGE RETENTION POLICY:
 * WhatsApp and Slack messages are auto-deleted after 3 days.
 * This is a security measure: message bodies contain personal
 * conversations that must not persist on disk indefinitely.
 */
export declare function runDecaySweep(): void;
/**
 * After an agent response, evaluate which surfaced memories were useful.
 * Fire-and-forget, never blocks the user. Has a 5-second timeout.
 */
export declare function evaluateMemoryRelevance(surfacedMemoryIds: number[], memorySummaries: Map<number, string>, userMessage: string, assistantResponse: string): Promise<void>;
/**
 * Check whether a memory nudge should be injected into the context.
 * Returns true if enough turns or time have passed since the last memory save.
 */
export declare function shouldNudgeMemory(chatId: string, agentId?: string): boolean;
export declare const MEMORY_NUDGE_TEXT = "[Memory nudge: It has been a while since anything was saved to long-term memory. If any decisions, preferences, or important facts came up in this conversation, consider mentioning them so they can be remembered.]";
//# sourceMappingURL=memory.d.ts.map