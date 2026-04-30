import { EventEmitter } from 'events';
export interface SignalIncomingMessage {
    /** Sender's phone number in E.164 form (e.g. "+4915125233709"). */
    sourceNumber: string;
    /** Sender's display name, if provided. */
    sourceName?: string;
    /** Unix ms when Signal received the message. */
    timestamp: number;
    /** Plain-text body. Empty string if the message is media-only. */
    text: string;
    /** Attachment descriptors (if any). */
    attachments: SignalAttachment[];
    /**
     * True if the envelope came in as a syncMessage rather than a direct
     * dataMessage. Sync messages fire when the same account sends a message
     * from any of its linked devices — Signal then mirrors that outbound
     * message to every other linked device so the conversation view stays
     * consistent. For a "Note to Self" on the phone, the Mac-side daemon
     * receives it as a sync with `destinationNumber` = own number.
     */
    isSync: boolean;
    /**
     * For sync messages, the recipient of the original outbound message.
     * Useful to distinguish a Note-to-Self (= our own number) from a sync
     * of a message Q sent to someone else. Undefined for direct messages.
     */
    destinationNumber?: string;
    /** Raw envelope for debugging / advanced use. */
    raw: unknown;
}
export interface SignalAttachment {
    id: string;
    contentType?: string;
    filename?: string;
    size?: number;
    /**
     * Local file path where signal-cli has stored the downloaded attachment
     * blob (typically under `~/.local/share/signal-cli/attachments/` or a
     * platform-appropriate equivalent). Present on inbound attachments.
     */
    path?: string;
}
export interface SignalRpcOptions {
    host: string;
    port: number;
    /** The daemon's bound account — passed implicitly; not needed per call. */
    account?: string;
    /** Timeout for a single JSON-RPC call. */
    callTimeoutMs?: number;
}
export declare class SignalRpcClient extends EventEmitter {
    private readonly opts;
    private socket;
    private buffer;
    private nextId;
    private readonly pending;
    private stopped;
    private reconnectDelayMs;
    constructor(opts: SignalRpcOptions);
    /** Connect and keep the socket alive. Auto-reconnects with exponential backoff. */
    connect(): Promise<void>;
    private attachSocket;
    /** Graceful shutdown. Blocks in-flight calls from being retried. */
    stop(): void;
    private failAllPending;
    private onData;
    /** Low-level JSON-RPC call. Most callers should use `send` / `sendTyping`. */
    call<T = unknown>(method: string, params: Record<string, unknown>): Promise<T>;
    /** Send a plain-text message to one recipient. */
    send(recipient: string, text: string): Promise<void>;
    /** Send a message with attachments (file paths on local disk). */
    sendWithAttachments(recipient: string, text: string, attachmentPaths: string[]): Promise<void>;
    /** Send a typing indicator (appears for ~10s in the receiver's Signal UI). */
    sendTyping(recipient: string): Promise<void>;
    /**
     * Parse a `receive` notification payload from the daemon.
     * Returns null if the payload doesn't look like a user-visible message
     * (e.g. receipt, typing indicator, empty sync-contacts message).
     */
    private parseReceive;
}
/** Typed helper for code that only wants the message event. */
export interface SignalRpcClient {
    on(event: 'message', listener: (msg: SignalIncomingMessage) => void): this;
    on(event: string | symbol, listener: (...args: unknown[]) => void): this;
}
//# sourceMappingURL=signal-rpc.d.ts.map