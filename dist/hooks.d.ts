export interface HookContext {
    chatId: string;
    agentId: string;
    message?: string;
    response?: string;
    sessionId?: string;
    usage?: Record<string, number>;
    error?: Error;
}
export type HookFn = (ctx: HookContext) => Promise<void>;
export interface HookRegistry {
    preMessage: HookFn[];
    postMessage: HookFn[];
    onSessionStart: HookFn[];
    onSessionEnd: HookFn[];
    onError: HookFn[];
}
/**
 * Create an empty hook registry with all hook point arrays initialized.
 */
export declare function createHookRegistry(): HookRegistry;
/**
 * Scan a directory for .js and .ts hook files.
 * Each file should default-export or named-export functions matching hook points
 * (preMessage, postMessage, onSessionStart, onSessionEnd, onError).
 *
 * Files are loaded in alphabetical order.
 */
export declare function loadHooksFromDir(dir: string, registry: HookRegistry): Promise<void>;
/**
 * Run an array of hook functions sequentially in order.
 * Each hook has a 5 second timeout. Failed or timed-out hooks log a
 * warning but do not block execution of subsequent hooks.
 */
export declare function runHooks(hooks: HookFn[], ctx: HookContext): Promise<void>;
//# sourceMappingURL=hooks.d.ts.map