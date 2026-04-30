export type OnIncomingMessage = (contactName: string, isGroup: boolean, groupName?: string) => void;
export interface WaChat {
    id: string;
    name: string;
    unreadCount: number;
    lastMessage: string;
    lastMessageTime: number;
    isGroup: boolean;
}
export interface WaMessage {
    body: string;
    fromMe: boolean;
    senderName: string;
    timestamp: number;
}
export declare function initWhatsApp(onIncoming: OnIncomingMessage): Promise<void>;
export declare function getWaChats(limit?: number): Promise<WaChat[]>;
export declare function getWaChatMessages(chatId: string, limit?: number): Promise<WaMessage[]>;
export declare function sendWhatsAppMessage(chatId: string, text: string): Promise<void>;
export declare function isWhatsAppReady(): boolean;
//# sourceMappingURL=whatsapp.d.ts.map