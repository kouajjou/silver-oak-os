/** Split a long response so Signal doesn't render one giant wall of text. */
declare function splitMessage(text: string): string[];
export interface SignalBot {
    start(): Promise<void>;
    stop(): Promise<void>;
    /** For outside code (e.g. scheduler / memory callbacks) to push messages. */
    sendTo(recipient: string, text: string): Promise<void>;
}
/**
 * Create the Signal bot. Does NOT connect yet — call `start()` to open the
 * socket and begin receiving messages.
 */
export declare function createSignalBot(): SignalBot;
/** Export for the scheduler — same shape as bot.ts's splitMessage. */
export { splitMessage };
//# sourceMappingURL=signal-bot.d.ts.map