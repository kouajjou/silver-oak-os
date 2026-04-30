/**
 * Run consolidation for a given chat. Finds patterns across unconsolidated
 * memories and creates synthesis records. Safe to call frequently; it's
 * a no-op if fewer than 2 memories are pending or if already running.
 */
export declare function runConsolidation(chatId: string): Promise<void>;
//# sourceMappingURL=memory-consolidate.d.ts.map