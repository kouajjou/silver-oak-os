export declare function setHighImportanceCallback(cb: (memoryId: number, summary: string, importance: number) => void): void;
/**
 * Analyze a conversation turn and extract structured memory if warranted.
 * Called async (fire-and-forget) after the assistant responds.
 * Returns true if a memory was saved, false if skipped.
 */
export declare function ingestConversationTurn(chatId: string, userMessage: string, assistantResponse: string, agentId?: string): Promise<boolean>;
//# sourceMappingURL=memory-ingest.d.ts.map