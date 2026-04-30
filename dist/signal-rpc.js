import net from 'net';
import { EventEmitter } from 'events';
import { logger } from './logger.js';
const DEFAULT_CALL_TIMEOUT_MS = 30_000;
export class SignalRpcClient extends EventEmitter {
    opts;
    socket = null;
    buffer = '';
    nextId = 1;
    pending = new Map();
    stopped = false;
    reconnectDelayMs = 500;
    constructor(opts) {
        super();
        this.opts = opts;
    }
    /** Connect and keep the socket alive. Auto-reconnects with exponential backoff. */
    async connect() {
        return new Promise((resolve, reject) => {
            const sock = new net.Socket();
            sock.setNoDelay(true);
            sock.setKeepAlive(true, 30_000);
            const onError = (err) => {
                sock.removeAllListeners();
                reject(err);
            };
            sock.once('error', onError);
            sock.connect(this.opts.port, this.opts.host, () => {
                sock.off('error', onError);
                this.attachSocket(sock);
                this.reconnectDelayMs = 500;
                resolve();
            });
        });
    }
    attachSocket(sock) {
        this.socket = sock;
        sock.on('data', (chunk) => this.onData(chunk));
        sock.on('error', (err) => logger.warn({ err }, 'signal-rpc socket error'));
        sock.on('close', () => {
            this.socket = null;
            this.failAllPending(new Error('signal-cli socket closed'));
            if (!this.stopped) {
                const delay = Math.min(this.reconnectDelayMs, 30_000);
                logger.warn({ delayMs: delay }, 'signal-rpc reconnecting');
                setTimeout(() => {
                    if (this.stopped)
                        return;
                    this.connect().catch((err) => logger.error({ err }, 'signal-rpc reconnect failed'));
                }, delay);
                this.reconnectDelayMs *= 2;
            }
        });
    }
    /** Graceful shutdown. Blocks in-flight calls from being retried. */
    stop() {
        this.stopped = true;
        this.failAllPending(new Error('signal-rpc client stopped'));
        try {
            this.socket?.end();
        }
        catch { /* ok */ }
        this.socket = null;
    }
    failAllPending(err) {
        for (const { reject, timer } of this.pending.values()) {
            clearTimeout(timer);
            reject(err);
        }
        this.pending.clear();
    }
    onData(chunk) {
        this.buffer += chunk.toString('utf-8');
        // Daemon sends newline-delimited JSON; consume as many complete lines as we have.
        let newlineIdx;
        while ((newlineIdx = this.buffer.indexOf('\n')) !== -1) {
            const line = this.buffer.slice(0, newlineIdx).trim();
            this.buffer = this.buffer.slice(newlineIdx + 1);
            if (!line)
                continue;
            try {
                const msg = JSON.parse(line);
                if (msg.method === 'receive') {
                    const incoming = this.parseReceive(msg.params);
                    if (incoming)
                        this.emit('message', incoming);
                }
                else if (typeof msg.id === 'number') {
                    const pending = this.pending.get(msg.id);
                    if (!pending)
                        continue;
                    this.pending.delete(msg.id);
                    clearTimeout(pending.timer);
                    if (msg.error) {
                        pending.reject(new Error(`signal-cli error ${msg.error.code}: ${msg.error.message}`));
                    }
                    else {
                        pending.resolve(msg.result);
                    }
                }
            }
            catch (err) {
                logger.warn({ err, line: line.slice(0, 200) }, 'signal-rpc could not parse line');
            }
        }
    }
    /** Low-level JSON-RPC call. Most callers should use `send` / `sendTyping`. */
    call(method, params) {
        if (!this.socket)
            return Promise.reject(new Error('signal-rpc not connected'));
        const id = this.nextId++;
        const body = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`signal-cli call '${method}' timed out after ${this.opts.callTimeoutMs ?? DEFAULT_CALL_TIMEOUT_MS}ms`));
            }, this.opts.callTimeoutMs ?? DEFAULT_CALL_TIMEOUT_MS);
            this.pending.set(id, {
                resolve: (v) => resolve(v),
                reject,
                timer,
            });
            this.socket.write(body, (err) => {
                if (err) {
                    this.pending.delete(id);
                    clearTimeout(timer);
                    reject(err);
                }
            });
        });
    }
    /** Send a plain-text message to one recipient. */
    async send(recipient, text) {
        await this.call('send', { recipient: [recipient], message: text });
    }
    /** Send a message with attachments (file paths on local disk). */
    async sendWithAttachments(recipient, text, attachmentPaths) {
        await this.call('send', {
            recipient: [recipient],
            message: text,
            attachment: attachmentPaths,
        });
    }
    /** Send a typing indicator (appears for ~10s in the receiver's Signal UI). */
    async sendTyping(recipient) {
        // signal-cli's `sendTyping` RPC — not all daemon versions expose it;
        // silently swallow "method not found" so it stays best-effort.
        try {
            await this.call('sendTyping', { recipient: [recipient] });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (!/method.*not.*found|-32601/i.test(msg))
                throw err;
        }
    }
    /**
     * Parse a `receive` notification payload from the daemon.
     * Returns null if the payload doesn't look like a user-visible message
     * (e.g. receipt, typing indicator, empty sync-contacts message).
     */
    parseReceive(params) {
        if (!params || typeof params !== 'object')
            return null;
        const p = params;
        const envelope = (p.envelope ?? p);
        if (!envelope || typeof envelope !== 'object')
            return null;
        const sourceNumber = envelope.sourceNumber ??
            envelope.source ??
            '';
        const sourceName = envelope.sourceName;
        const timestamp = typeof envelope.timestamp === 'number' ? envelope.timestamp : Date.now();
        // The actual message body lives in one of: dataMessage (incoming),
        // syncMessage.sentMessage.dataMessage (sync from a linked device).
        // Signal also sends receipts, typing, etc. — we only care about ones
        // with a text body or attachments.
        let dataMessage;
        let isSync = false;
        let destinationNumber;
        if (envelope.dataMessage && typeof envelope.dataMessage === 'object') {
            dataMessage = envelope.dataMessage;
        }
        else if (envelope.syncMessage && typeof envelope.syncMessage === 'object') {
            const syncMessage = envelope.syncMessage;
            const sentMessage = syncMessage.sentMessage;
            if (sentMessage?.message !== undefined || sentMessage?.attachments?.length) {
                // Sync messages look slightly different — the text is under
                // syncMessage.sentMessage.message (no nested dataMessage).
                dataMessage = sentMessage;
                isSync = true;
                destinationNumber =
                    sentMessage?.destinationNumber ??
                        sentMessage?.destination;
            }
        }
        if (!dataMessage)
            return null;
        const text = dataMessage.message ??
            dataMessage.body ??
            '';
        const rawAttachments = dataMessage.attachments ?? [];
        const attachments = rawAttachments
            .filter((a) => a !== null && typeof a === 'object')
            .map((a) => ({
            id: a.id ?? a.contentType ?? String(Date.now()),
            contentType: a.contentType,
            filename: a.filename,
            size: a.size,
            path: a.path ?? a.file,
        }));
        if (!text && attachments.length === 0)
            return null;
        return {
            sourceNumber,
            sourceName,
            timestamp,
            text,
            attachments,
            isSync,
            destinationNumber,
            raw: envelope,
        };
    }
}
//# sourceMappingURL=signal-rpc.js.map