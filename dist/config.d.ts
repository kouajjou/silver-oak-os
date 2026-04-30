export declare let AGENT_ID: string;
export declare let activeBotToken: string;
export declare let agentCwd: string | undefined;
export declare let agentDefaultModel: string | undefined;
export declare let agentObsidianConfig: {
    vault: string;
    folders: string[];
    readOnly?: string[];
} | undefined;
export declare let agentSystemPrompt: string | undefined;
export declare let agentMcpAllowlist: string[] | undefined;
export declare let agentSkillsAllowlist: string[] | undefined;
export declare function setAgentOverrides(opts: {
    agentId: string;
    botToken: string;
    cwd: string;
    model?: string;
    obsidian?: {
        vault: string;
        folders: string[];
        readOnly?: string[];
    };
    systemPrompt?: string;
    mcpServers?: string[];
    skillsAllowlist?: string[];
}): void;
export declare const TELEGRAM_BOT_TOKEN: string;
export declare const ALLOWED_CHAT_ID: string;
export type MessengerType = 'telegram' | 'signal';
export declare const MESSENGER_TYPE: MessengerType;
export declare const SIGNAL_PHONE_NUMBER: string;
export declare const SIGNAL_RPC_HOST: string;
export declare const SIGNAL_RPC_PORT: number;
export declare const SIGNAL_AUTHORIZED_RECIPIENTS: string[];
export declare const WHATSAPP_ENABLED: boolean;
export declare const SLACK_USER_TOKEN: string;
export declare const GROQ_API_KEY: string;
export declare const ELEVENLABS_API_KEY: string;
export declare const ELEVENLABS_VOICE_ID: string;
export declare const PROJECT_ROOT: string;
export declare const STORE_DIR: string;
/** Expand ~/... to an absolute path. */
export declare function expandHome(p: string): string;
/**
 * Absolute path to the external config directory.
 * Defaults to ~/.claudeclaw. Set CLAUDECLAW_CONFIG in .env or environment to override.
 */
export declare const CLAUDECLAW_CONFIG: string;
export declare const MAX_MESSAGE_LENGTH = 4096;
export declare const TYPING_REFRESH_MS = 4000;
export declare const AGENT_TIMEOUT_MS: number;
export declare const MISSION_TIMEOUT_MS: number;
export declare const AGENT_MAX_TURNS: number;
export declare const CONTEXT_LIMIT: number;
export declare const DASHBOARD_PORT: number;
export declare const DASHBOARD_TOKEN: string;
export declare const DASHBOARD_URL: string;
export declare const DB_ENCRYPTION_KEY: string;
export declare const GOOGLE_API_KEY: string;
export type StreamStrategy = 'global-throttle' | 'single-agent-only' | 'off';
export declare const STREAM_STRATEGY: StreamStrategy;
export declare const SECURITY_PIN_HASH: string;
export declare const IDLE_LOCK_MINUTES: number;
export declare const EMERGENCY_KILL_PHRASE: string;
export declare const MODEL_FALLBACK_CHAIN: string[];
export declare const SMART_ROUTING_ENABLED: boolean;
export declare const SMART_ROUTING_CHEAP_MODEL: string;
export type CostFooterMode = 'off' | 'compact' | 'verbose' | 'cost' | 'full';
export declare const SHOW_COST_FOOTER: CostFooterMode;
export declare const MEMORY_NOTIFY: boolean;
export declare const DAILY_COST_BUDGET: number;
export declare const HOURLY_TOKEN_BUDGET: number;
export declare const MEMORY_NUDGE_INTERVAL_TURNS: number;
export declare const MEMORY_NUDGE_INTERVAL_HOURS: number;
export declare const EXFILTRATION_GUARD_ENABLED: boolean;
export declare const PROTECTED_ENV_VARS: string[];
export declare const WARROOM_ENABLED: boolean;
export declare const WARROOM_PORT: number;
//# sourceMappingURL=config.d.ts.map