/**
 * Daily.co REST API wrapper.
 *
 * Thin client for the endpoints meet-cli needs to spin up voice-only
 * meeting rooms. We intentionally keep this minimal: create a room with
 * a short TTL, optionally delete it, maybe generate a meeting token.
 * All the real work (audio pipeline, agent brain) lives inside the
 * Pipecat daily_agent.py process that joins the room we create here.
 *
 * Docs: https://docs.daily.co/reference/rest-api
 */
import { readEnvFile } from './env.js';
const DAILY_API_BASE = process.env.DAILY_API_BASE_URL || 'https://api.daily.co/v1';
export class DailyApiError extends Error {
    status;
    body;
    constructor(message, status, body) {
        super(message);
        this.status = status;
        this.body = body;
        this.name = 'DailyApiError';
    }
}
function resolveKey() {
    if (process.env.DAILY_API_KEY)
        return process.env.DAILY_API_KEY;
    const fromEnv = readEnvFile(['DAILY_API_KEY']);
    if (fromEnv.DAILY_API_KEY)
        return fromEnv.DAILY_API_KEY;
    throw new DailyApiError('DAILY_API_KEY not set. Sign up at https://dashboard.daily.co/signup and drop the key in project .env.', 0, null);
}
async function request(path, init = {}) {
    const key = resolveKey();
    const headers = {
        Authorization: `Bearer ${key}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
    };
    const res = await fetch(`${DAILY_API_BASE}${path}`, { ...init, headers });
    const text = await res.text();
    let body = null;
    try {
        body = text ? JSON.parse(text) : null;
    }
    catch {
        body = text;
    }
    if (!res.ok) {
        const msg = body?.info
            || body?.error
            || `HTTP ${res.status}`;
        throw new DailyApiError(`Daily API ${path}: ${msg}`, res.status, body);
    }
    return body;
}
/**
 * Create a short-lived Daily.co room for an agent meeting session.
 *
 * Defaults are tuned for the meet-bot use case: 2-hour TTL, auto-close
 * when expired, no prejoin UI so the host can drop in instantly, both
 * audio and video allowed so the human can choose.
 */
export async function createRoom(opts = {}) {
    const ttl = opts.ttlSec ?? 2 * 60 * 60; // 2 hours default
    const exp = Math.floor(Date.now() / 1000) + ttl;
    const body = {
        properties: {
            exp,
            eject_at_room_exp: true,
            enable_prejoin_ui: opts.enablePrejoinUi ?? false,
            start_audio_off: false,
            start_video_off: false,
        },
    };
    if (opts.name)
        body.name = opts.name;
    return await request('/rooms', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}
export async function deleteRoom(name) {
    await request(`/rooms/${encodeURIComponent(name)}`, {
        method: 'DELETE',
    });
}
export async function getRoom(name) {
    return await request(`/rooms/${encodeURIComponent(name)}`);
}
/**
 * Create a meeting token. Lets us restrict who can join, name the bot,
 * and grant owner permissions to specific participants. For v1 the bot
 * itself doesn't need a token (public rooms work), but we mint one for
 * the agent so it appears with the right display name in the Daily UI.
 */
export async function createToken(opts) {
    const exp = Math.floor(Date.now() / 1000) + (opts.expSec ?? 2 * 60 * 60);
    const res = await request('/meeting-tokens', {
        method: 'POST',
        body: JSON.stringify({
            properties: {
                room_name: opts.roomName,
                user_name: opts.userName,
                is_owner: opts.isOwner ?? false,
                exp,
            },
        }),
    });
    return res.token;
}
//# sourceMappingURL=daily-client.js.map