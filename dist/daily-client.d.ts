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
export declare class DailyApiError extends Error {
    status: number;
    body: unknown;
    constructor(message: string, status: number, body: unknown);
}
export interface DailyRoom {
    id: string;
    name: string;
    url: string;
    api_created: boolean;
    privacy: 'public' | 'private';
    created_at: string;
    config: {
        exp?: number;
        eject_at_room_exp?: boolean;
        enable_prejoin_ui?: boolean;
        start_audio_off?: boolean;
        start_video_off?: boolean;
        [k: string]: unknown;
    };
}
/**
 * Create a short-lived Daily.co room for an agent meeting session.
 *
 * Defaults are tuned for the meet-bot use case: 2-hour TTL, auto-close
 * when expired, no prejoin UI so the host can drop in instantly, both
 * audio and video allowed so the human can choose.
 */
export declare function createRoom(opts?: {
    name?: string;
    ttlSec?: number;
    enablePrejoinUi?: boolean;
}): Promise<DailyRoom>;
export declare function deleteRoom(name: string): Promise<void>;
export declare function getRoom(name: string): Promise<DailyRoom>;
/**
 * Create a meeting token. Lets us restrict who can join, name the bot,
 * and grant owner permissions to specific participants. For v1 the bot
 * itself doesn't need a token (public rooms work), but we mint one for
 * the agent so it appears with the right display name in the Daily UI.
 */
export declare function createToken(opts: {
    roomName: string;
    userName: string;
    isOwner?: boolean;
    expSec?: number;
}): Promise<string>;
//# sourceMappingURL=daily-client.d.ts.map