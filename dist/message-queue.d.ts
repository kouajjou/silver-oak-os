/**
 * Per-chat FIFO message queue. Ensures only one message is processed
 * at a time per chat_id, preventing race conditions on sessions,
 * abort controllers, and conversation logs.
 */
declare class MessageQueue {
    private chains;
    private pending;
    /**
     * Enqueue a message handler for a given chat. Handlers for the same
     * chatId run sequentially in FIFO order. Different chatIds run in parallel.
     */
    enqueue(chatId: string, handler: () => Promise<void>): void;
    /** Number of chats with pending messages. */
    get activeChats(): number;
    /** Number of pending messages for a given chat. */
    queuedFor(chatId: string): number;
}
export declare const messageQueue: MessageQueue;
export {};
//# sourceMappingURL=message-queue.d.ts.map