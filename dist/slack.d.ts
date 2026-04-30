export interface SlackConversation {
    id: string;
    name: string;
    isIm: boolean;
    unreadCount: number;
    lastMessage: string;
    lastMessageTs: number;
}
export interface SlackMessage {
    text: string;
    userName: string;
    fromMe: boolean;
    ts: string;
    threadTs?: string;
}
export declare function getSlackConversations(limit?: number): Promise<SlackConversation[]>;
export declare function getSlackMessages(channelId: string, limit?: number): Promise<SlackMessage[]>;
export declare function sendSlackMessage(channelId: string, text: string, channelName: string, threadTs?: string): Promise<void>;
//# sourceMappingURL=slack.d.ts.map