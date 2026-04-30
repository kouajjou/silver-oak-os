import { EventEmitter } from 'node:events';
export declare function setBotInfo(username: string, name: string): void;
export declare function getBotInfo(): {
    username: string;
    name: string;
};
interface AgentConnState {
    telegram?: boolean;
    updatedAt: number;
}
/**
 * Read an agent's persisted connection state. Returns null if the file
 * doesn't exist (agent hasn't run since this was introduced, or hasn't
 * emitted a state update yet). Called by dashboard aggregation.
 */
export declare function readAgentConnState(agentId: string): AgentConnState | null;
export declare function getTelegramConnected(): boolean;
export declare function setTelegramConnected(v: boolean): void;
export interface ChatEvent {
    type: 'user_message' | 'assistant_message' | 'processing' | 'progress' | 'error' | 'hive_mind' | 'mission_update';
    chatId: string;
    agentId?: string;
    content?: string;
    source?: 'telegram' | 'dashboard' | 'signal';
    description?: string;
    processing?: boolean;
    timestamp: number;
}
export declare const chatEvents: EventEmitter<[never]>;
export declare function emitChatEvent(event: Omit<ChatEvent, 'timestamp'>): void;
export declare function setProcessing(chatId: string, v: boolean, agentId?: string): void;
export declare function getIsProcessing(): {
    processing: boolean;
    chatId: string;
};
export declare function setActiveAbort(chatId: string, ctrl: AbortController | null): void;
export declare function abortActiveQuery(chatId: string): boolean;
export {};
//# sourceMappingURL=state.d.ts.map