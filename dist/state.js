import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { AGENT_ID, STORE_DIR } from './config.js';
import { logger } from './logger.js';
// ── Bot info (set once from onStart, read by dashboard) ─────────────
let _botUsername = '';
let _botName = '';
export function setBotInfo(username, name) {
    _botUsername = username;
    _botName = name;
}
export function getBotInfo() {
    return { username: _botUsername, name: _botName };
}
function connStatePath(agentId = AGENT_ID) {
    return path.join(STORE_DIR, `agent-${agentId}-conn.json`);
}
function persistAgentConnState(fields) {
    try {
        if (!fs.existsSync(STORE_DIR))
            fs.mkdirSync(STORE_DIR, { recursive: true });
        const p = connStatePath();
        let current = {};
        if (fs.existsSync(p)) {
            try {
                current = JSON.parse(fs.readFileSync(p, 'utf-8'));
            }
            catch (err) {
                logger.warn({ err, path: p }, 'agent conn-state file is corrupt, overwriting');
            }
        }
        const next = { ...current, ...fields, updatedAt: Date.now() };
        fs.writeFileSync(p, JSON.stringify(next), 'utf-8');
    }
    catch (err) {
        // Non-fatal: disk-full or perms issue shouldn't crash a bot, but don't
        // hide it entirely either — the pill will just go out-of-date.
        logger.warn({ err, agentId: AGENT_ID }, 'could not persist agent conn-state');
    }
}
/**
 * Read an agent's persisted connection state. Returns null if the file
 * doesn't exist (agent hasn't run since this was introduced, or hasn't
 * emitted a state update yet). Called by dashboard aggregation.
 */
export function readAgentConnState(agentId) {
    try {
        const p = connStatePath(agentId);
        if (!fs.existsSync(p))
            return null;
        return JSON.parse(fs.readFileSync(p, 'utf-8'));
    }
    catch {
        return null;
    }
}
// ── Telegram connection state ────────────────────────────────────────
let _telegramConnected = false;
export function getTelegramConnected() {
    return _telegramConnected;
}
export function setTelegramConnected(v) {
    _telegramConnected = v;
    persistAgentConnState({ telegram: v });
}
export const chatEvents = new EventEmitter();
chatEvents.setMaxListeners(20);
export function emitChatEvent(event) {
    const full = { ...event, timestamp: Date.now() };
    chatEvents.emit('chat', full);
}
// ── Processing state ─────────────────────────────────────────────────
let _processing = false;
let _processingChatId = '';
export function setProcessing(chatId, v, agentId) {
    _processing = v;
    _processingChatId = v ? chatId : '';
    emitChatEvent({ type: 'processing', chatId, agentId, processing: v });
}
export function getIsProcessing() {
    return { processing: _processing, chatId: _processingChatId };
}
// ── Active query abort ──────────────────────────────────────────────
const _activeAbort = new Map();
export function setActiveAbort(chatId, ctrl) {
    if (ctrl)
        _activeAbort.set(chatId, ctrl);
    else
        _activeAbort.delete(chatId);
}
export function abortActiveQuery(chatId) {
    const ctrl = _activeAbort.get(chatId);
    if (ctrl) {
        ctrl.abort();
        _activeAbort.delete(chatId);
        return true;
    }
    return false;
}
//# sourceMappingURL=state.js.map