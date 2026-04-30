type Sender = (text: string) => Promise<void>;
export declare function initScheduler(send: Sender, agentId?: string): void;
export declare function computeNextRun(cronExpression: string): number;
export {};
//# sourceMappingURL=scheduler.d.ts.map