import { Api, Bot, RawApi } from 'grammy';
export declare function setMainModelOverride(model: string): void;
/**
 * Convert Markdown to Telegram HTML.
 *
 * Telegram supports a limited HTML subset: <b>, <i>, <s>, <u>, <code>, <pre>, <a>.
 * It does NOT support: # headings, ---, - [ ] checkboxes, or most Markdown syntax.
 * This function bridges the gap so Claude's responses render cleanly.
 */
export declare function formatForTelegram(text: string): string;
/**
 * Split a long response into Telegram-safe chunks (4096 chars).
 * Splits on newlines where possible to avoid breaking mid-sentence.
 */
export declare function splitMessage(text: string): string[];
export interface FileMarker {
    type: 'document' | 'photo';
    filePath: string;
    caption?: string;
}
export interface ExtractResult {
    text: string;
    files: FileMarker[];
}
/**
 * Extract [SEND_FILE:path] and [SEND_PHOTO:path] markers from Claude's response.
 * Supports optional captions via pipe: [SEND_FILE:/path/to/file.pdf|Here's your report]
 *
 * Returns the cleaned text (markers stripped) and an array of file descriptors.
 */
export declare function extractFileMarkers(text: string): ExtractResult;
/**
 * Send a HITL request with inline keyboard to Karim.
 * callback_data format: "hitl:<tid>:<action>" (max 64 bytes total)
 * Returns ticketId used to look up pending resolve later.
 */
export declare function sendHITLRequest(api: Bot["api"], ticketId: string, question: string, options: string[]): Promise<{
    ticketId: string;
}>;
export declare function createBot(): Bot;
/**
 * Dispatch a dashboard chat message to another agent's process via the
 * mission task queue. The target agent claims the task from its own
 * scheduler loop, runs it with its own model / system prompt / memory /
 * session, and saves the turns to conversation_log under its agent_id.
 *
 * This function watches the task for completion and emits SSE chat events
 * so the dashboard frontend renders the response in the right tab.
 */
export declare function dispatchDashboardChatToAgent(text: string, targetAgentId: string): void;
/**
 * Process a message sent from the dashboard web UI for the hosting agent.
 * Sub-agent messages go via dispatchDashboardChatToAgent above.
 * Response is delivered via SSE (fire-and-forget from the caller's perspective).
 */
export declare function processMessageFromDashboard(botApi: Api<RawApi>, text: string): Promise<void>;
/**
 * Send a brief WhatsApp notification ping to Telegram (no message content).
 * Full message is only shown when user runs /wa.
 */
export declare function notifyWhatsAppIncoming(api: Bot['api'], contactName: string, isGroup: boolean, groupName?: string): Promise<void>;
//# sourceMappingURL=bot.d.ts.map