interface AgentRestartHistory {
    agent_id: string;
    last_check: number;
    restarts_window: {
        ts: number;
        n_restarts: number;
    }[];
    alerted: boolean;
}
export declare function startAgentWatchdog(): void;
export declare function stopAgentWatchdog(): void;
export declare function getWatchdogStats(): {
    monitored_agents: number;
    histories: AgentRestartHistory[];
};
export {};
//# sourceMappingURL=agent-watchdog.d.ts.map