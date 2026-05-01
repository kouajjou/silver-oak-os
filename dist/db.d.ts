/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns a compact string: iv:authTag:ciphertext (all hex-encoded).
 */
export declare function encryptField(plaintext: string): string;
/**
 * Decrypt a string produced by encryptField().
 * Returns the original plaintext. If decryption fails (wrong key, tampered),
 * returns the raw input unchanged (graceful fallback for pre-encryption data).
 */
export declare function decryptField(ciphertext: string): string;
export declare function initDatabase(): void;
/** @internal - for tests only. Creates a fresh in-memory database. */
export declare function _initTestDatabase(): void;
export declare function getSession(chatId: string, agentId?: string): string | undefined;
export declare function setSession(chatId: string, sessionId: string, agentId?: string): void;
export declare function clearSession(chatId: string, agentId?: string): void;
export interface Memory {
    id: number;
    chat_id: string;
    source: string;
    agent_id: string;
    raw_text: string;
    summary: string;
    entities: string;
    topics: string;
    connections: string;
    importance: number;
    salience: number;
    consolidated: number;
    pinned: number;
    embedding: string | null;
    created_at: number;
    accessed_at: number;
}
export interface Consolidation {
    id: number;
    chat_id: string;
    source_ids: string;
    summary: string;
    insight: string;
    created_at: number;
    embedding?: string;
    embedding_model?: string;
}
export declare function saveStructuredMemory(chatId: string, rawText: string, summary: string, entities: string[], topics: string[], importance: number, source?: string, agentId?: string): number;
/**
 * Search memories using embedding similarity (primary) with FTS5/LIKE fallback.
 * The queryEmbedding parameter is optional; if provided, vector search is used first.
 * If not provided (or no embeddings in DB), falls back to keyword search.
 */
export declare function searchMemories(chatId: string, query: string, limit?: number, queryEmbedding?: number[], agentId?: string): Memory[];
export declare function saveMemoryEmbedding(memoryId: number, embedding: number[]): void;
/**
 * Atomically save a structured memory and its embedding in a single transaction.
 * If either step fails, both are rolled back.
 */
export declare function saveStructuredMemoryAtomic(chatId: string, rawText: string, summary: string, entities: string[], topics: string[], importance: number, embedding: number[], source?: string, agentId?: string): number;
export declare function getMemoriesWithEmbeddings(chatId: string, agentId?: string): Array<{
    id: number;
    embedding: number[];
    summary: string;
    importance: number;
}>;
export declare function getRecentHighImportanceMemories(chatId: string, limit?: number, agentId?: string): Memory[];
export declare function getRecentMemories(chatId: string, limit?: number, agentId?: string): Memory[];
export declare function touchMemory(id: number): void;
export declare function penalizeMemory(memoryId: number): void;
/**
 * Batch-update salience for multiple memories in a single transaction.
 * Reduces SQLite lock contention when multiple agents finish concurrently.
 */
export declare function batchUpdateMemoryRelevance(allIds: number[], usefulIds: Set<number>): void;
/**
 * Importance-weighted decay. High-importance memories decay slower.
 * Pinned memories are exempt from decay entirely.
 * - pinned:             no decay (permanent)
 * - importance >= 0.8:  1% per day (retains ~460 days)
 * - importance >= 0.5:  2% per day (retains ~230 days)
 * - importance < 0.5:   5% per day (retains ~90 days)
 */
export declare function decayMemories(): void;
export declare function pinMemory(memoryId: number): void;
export declare function unpinMemory(memoryId: number): void;
export declare function getUnconsolidatedMemories(chatId: string, limit?: number): Memory[];
/**
 * Count unconsolidated memories for a chat. Used by the event-driven
 * consolidation trigger (replaces the fixed 30-min interval).
 */
export declare function countUnconsolidatedMemories(chatId: string): number;
export declare function saveConsolidation(chatId: string, sourceIds: number[], summary: string, insight: string): number;
export declare function saveConsolidationEmbedding(consolidationId: number, embedding: number[]): void;
export declare function getConsolidationsWithEmbeddings(chatId: string): Array<{
    id: number;
    embedding: number[];
    summary: string;
    insight: string;
}>;
export declare function supersedeMemory(oldId: number, newId: number): void;
export declare function updateMemoryConnections(memoryId: number, connections: Array<{
    linked_to: number;
    relationship: string;
}>): void;
export declare function markMemoriesConsolidated(ids: number[]): void;
/**
 * Atomically save a consolidation, wire connections, handle contradictions,
 * and mark source memories as consolidated. If any step fails, all roll back.
 */
export declare function saveConsolidationAtomic(chatId: string, sourceIds: number[], summary: string, insight: string, connections: Array<{
    from_id: number;
    to_id: number;
    relationship: string;
}>, contradictions: Array<{
    stale_id: number;
    superseded_by: number;
}>): number;
export declare function getRecentConsolidations(chatId: string, limit?: number): Consolidation[];
export declare function searchConsolidations(chatId: string, query: string, limit?: number): Consolidation[];
export interface ScheduledTask {
    id: string;
    prompt: string;
    schedule: string;
    next_run: number;
    last_run: number | null;
    last_result: string | null;
    status: 'active' | 'paused' | 'running';
    created_at: number;
    agent_id: string;
    started_at: number | null;
    last_status: 'success' | 'failed' | 'timeout' | null;
}
export declare function createScheduledTask(id: string, prompt: string, schedule: string, nextRun: number, agentId?: string): void;
export declare function getDueTasks(agentId?: string): ScheduledTask[];
export declare function getAllScheduledTasks(agentId?: string): ScheduledTask[];
/**
 * Mark a task as running and optionally advance its next_run to the next
 * scheduled occurrence. Advancing next_run immediately prevents the scheduler
 * from re-firing the same task on subsequent ticks while it is still executing
 * (double-fire bug), and survives process restarts since the value is persisted.
 */
export declare function markTaskRunning(id: string, tentativeNextRun?: number): void;
export declare function updateTaskAfterRun(id: string, nextRun: number, result: string, lastStatus?: 'success' | 'failed' | 'timeout'): void;
export declare function resetStuckTasks(agentId: string): number;
export declare function deleteScheduledTask(id: string): void;
export declare function pauseScheduledTask(id: string): void;
export declare function resumeScheduledTask(id: string): void;
/**
 * Get recent scheduled task outputs for a given agent.
 * Used to inject context into the next user message so Claude knows
 * what was just shown to the user via a scheduled task.
 *
 * Returns tasks that ran in the last `withinMinutes` (default 30).
 */
export declare function getRecentTaskOutputs(agentId: string, withinMinutes?: number): Array<{
    prompt: string;
    last_result: string;
    last_run: number;
}>;
export declare function saveWaMessageMap(telegramMsgId: number, waChatId: string, contactName: string): void;
export declare function lookupWaChatId(telegramMsgId: number): {
    waChatId: string;
    contactName: string;
} | null;
export declare function getRecentWaContacts(limit?: number): Array<{
    waChatId: string;
    contactName: string;
    lastSeen: number;
}>;
export interface WaOutboxItem {
    id: number;
    to_chat_id: string;
    body: string;
    created_at: number;
}
export declare function enqueueWaMessage(toChatId: string, body: string): number;
export declare function getPendingWaMessages(): WaOutboxItem[];
export declare function markWaMessageSent(id: number): void;
/**
 * Prune WhatsApp messages older than the given number of days.
 * Covers wa_messages, wa_outbox (sent only), and wa_message_map.
 */
export declare function pruneWaMessages(retentionDays?: number): {
    messages: number;
    outbox: number;
    map: number;
};
/**
 * Prune Slack messages older than the given number of days.
 */
export declare function pruneSlackMessages(retentionDays?: number): number;
export interface ConversationTurn {
    id: number;
    chat_id: string;
    session_id: string | null;
    role: string;
    content: string;
    created_at: number;
}
export declare function logConversationTurn(chatId: string, role: 'user' | 'assistant', content: string, sessionId?: string, agentId?: string): void;
export declare function getRecentConversation(chatId: string, limit?: number, agentId?: string): ConversationTurn[];
/**
 * Search conversation_log by keywords. Used when the user asks about
 * past conversations ("remember when we...", "what did we talk about").
 * Returns recent turns that match any keyword, grouped chronologically.
 */
export declare function searchConversationHistory(chatId: string, query: string, agentId?: string, daysBack?: number, limit?: number): ConversationTurn[];
/**
 * Get a page of conversation turns for the dashboard chat overlay.
 * Returns turns in reverse chronological order (newest first).
 * Use `beforeId` for cursor-based pagination (load older messages).
 */
export declare function getConversationPage(chatId: string, limit?: number, beforeId?: number, agentId?: string): ConversationTurn[];
/**
 * Prune old conversation_log entries, keeping only the most recent N rows
 * per (chat_id, agent_id) pair. Scoping by agent matters because all five
 * agents share the same chat_id in a typical install, and a chatty agent
 * could otherwise evict a quieter agent's history under the shared cap.
 * Wrapped in a transaction so a mid-loop crash can't leave the table in a
 * half-pruned state.
 */
export declare function pruneConversationLog(keepPerChat?: number): void;
export declare function saveWaMessage(chatId: string, contactName: string, body: string, timestamp: number, isFromMe: boolean): void;
export interface WaMessageRow {
    id: number;
    chat_id: string;
    contact_name: string;
    body: string;
    timestamp: number;
    is_from_me: number;
    created_at: number;
}
export declare function getRecentWaMessages(chatId: string, limit?: number): WaMessageRow[];
export declare function saveSlackMessage(channelId: string, channelName: string, userName: string, body: string, timestamp: string, isFromMe: boolean): void;
export interface SlackMessageRow {
    id: number;
    channel_id: string;
    channel_name: string;
    user_name: string;
    body: string;
    timestamp: string;
    is_from_me: number;
    created_at: number;
}
export declare function getRecentSlackMessages(channelId: string, limit?: number): SlackMessageRow[];
export declare function saveTokenUsage(chatId: string, sessionId: string | undefined, inputTokens: number, outputTokens: number, cacheRead: number, contextTokens: number, costUsd: number, didCompact: boolean, agentId?: string): void;
export interface SessionTokenSummary {
    turns: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    lastCacheRead: number;
    lastContextTokens: number;
    totalCostUsd: number;
    compactions: number;
    firstTurnAt: number;
    lastTurnAt: number;
}
export interface DashboardMemoryStats {
    total: number;
    pinned: number;
    consolidations: number;
    avgImportance: number;
    avgSalience: number;
    importanceDistribution: {
        bucket: string;
        count: number;
    }[];
}
export declare function getDashboardMemoryStats(chatId: string): DashboardMemoryStats;
export declare function getDashboardPinnedMemories(chatId: string): Memory[];
export declare function getDashboardLowSalienceMemories(chatId: string, limit?: number): Memory[];
export declare function getDashboardTopAccessedMemories(chatId: string, limit?: number): Memory[];
export declare function getDashboardMemoryTimeline(chatId: string, days?: number): {
    date: string;
    count: number;
}[];
export declare function getDashboardConsolidations(chatId: string, limit?: number): Consolidation[];
export interface DashboardTokenStats {
    todayInput: number;
    todayOutput: number;
    todayCost: number;
    todayTurns: number;
    allTimeCost: number;
    allTimeTurns: number;
}
export declare function getDashboardTokenStats(chatId: string): DashboardTokenStats;
export declare function getDashboardCostTimeline(chatId: string, days?: number): {
    date: string;
    cost: number;
    turns: number;
}[];
export interface RecentTokenUsageRow {
    id: number;
    chat_id: string;
    session_id: string | null;
    input_tokens: number;
    output_tokens: number;
    cache_read: number;
    context_tokens: number;
    cost_usd: number;
    did_compact: number;
    created_at: number;
}
export declare function getDashboardRecentTokenUsage(chatId: string, limit?: number): RecentTokenUsageRow[];
export declare function getDashboardMemoriesList(chatId: string, limit?: number, offset?: number, sortBy?: 'importance' | 'salience' | 'recent'): {
    memories: Memory[];
    total: number;
};
export interface HiveMindEntry {
    id: number;
    agent_id: string;
    chat_id: string;
    action: string;
    summary: string;
    artifacts: string | null;
    created_at: number;
}
export declare function logToHiveMind(agentId: string, chatId: string, action: string, summary: string, artifacts?: string): void;
export declare function getHiveMindEntries(limit?: number, agentId?: string): HiveMindEntry[];
/**
 * Get recent hive_mind entries from agents OTHER than the given one.
 * Used to give each agent awareness of what teammates have been doing.
 */
export declare function getOtherAgentActivity(excludeAgentId: string, hoursBack?: number, limit?: number): HiveMindEntry[];
/**
 * Get conversation turns for a specific session, ordered chronologically.
 * Used for hive-mind auto-commit on session end.
 */
export declare function getSessionConversation(sessionId: string, limit?: number): ConversationTurn[];
export declare function getAgentTokenStats(agentId: string): {
    todayCost: number;
    todayTurns: number;
    allTimeCost: number;
};
export declare function getAgentRecentConversation(agentId: string, chatId: string, limit?: number): ConversationTurn[];
export declare function getSessionTokenUsage(sessionId: string): SessionTokenSummary | null;
export interface InterAgentTask {
    id: string;
    from_agent: string;
    to_agent: string;
    chat_id: string;
    prompt: string;
    status: string;
    result: string | null;
    created_at: string;
    completed_at: string | null;
}
export declare function createInterAgentTask(id: string, fromAgent: string, toAgent: string, chatId: string, prompt: string): void;
export declare function completeInterAgentTask(id: string, status: 'completed' | 'failed', result: string | null): void;
export declare function getInterAgentTasks(limit?: number, status?: string): InterAgentTask[];
export interface MissionTask {
    id: string;
    title: string;
    prompt: string;
    assigned_agent: string | null;
    status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
    result: string | null;
    error: string | null;
    created_by: string;
    priority: number;
    timeout_ms: number | null;
    type: string;
    chat_id: string | null;
    created_at: number;
    started_at: number | null;
    completed_at: number | null;
}
export declare function createMissionTask(id: string, title: string, prompt: string, assignedAgent?: string | null, createdBy?: string, priority?: number, timeoutMs?: number | null, type?: 'async' | 'chat', chatId?: string | null): void;
export declare function updateMissionTaskTimeout(id: string, timeoutMs: number): boolean;
export declare function getUnassignedMissionTasks(): MissionTask[];
/**
 * List mission tasks for the Mission Control UI. Chat-type tasks are the
 * transport for dashboard per-agent chat and are excluded by default so
 * they don't pollute the task list. Pass `includeChat: true` for debug.
 */
export declare function getMissionTasks(agentId?: string, status?: string, includeChat?: boolean): MissionTask[];
export declare function getMissionTask(id: string): MissionTask | null;
export declare function claimNextMissionTask(agentId: string): MissionTask | null;
export declare function completeMissionTask(id: string, result: string | null, status: 'completed' | 'failed', error?: string): void;
export declare function cancelMissionTask(id: string): boolean;
export declare function deleteMissionTask(id: string): boolean;
export declare function cleanupOldMissionTasks(olderThanDays?: number): number;
export declare function reassignMissionTask(id: string, newAgent: string): boolean;
export declare function assignMissionTask(id: string, agent: string): boolean;
export declare function getMissionTaskHistory(limit?: number, offset?: number): {
    tasks: MissionTask[];
    total: number;
};
export declare function resetStuckMissionTasks(agentId: string): number;
export type MeetProvider = 'pika' | 'recall' | 'daily';
export interface MeetSession {
    id: string;
    agent_id: string;
    meet_url: string;
    bot_name: string;
    platform: string;
    provider: MeetProvider;
    status: 'joining' | 'live' | 'left' | 'failed';
    voice_id: string | null;
    image_path: string | null;
    brief_path: string | null;
    created_at: number;
    joined_at: number | null;
    left_at: number | null;
    post_notes: string | null;
    error: string | null;
}
export declare function createMeetSession(session: {
    id: string;
    agentId: string;
    meetUrl: string;
    botName: string;
    platform?: string;
    provider?: MeetProvider;
    voiceId?: string | null;
    imagePath?: string | null;
    briefPath?: string | null;
}): void;
export declare function markMeetSessionLive(id: string): void;
export declare function markMeetSessionLeft(id: string, postNotes?: string | null): void;
export declare function markMeetSessionFailed(id: string, error: string): void;
export declare function getMeetSession(id: string): MeetSession | null;
export declare function listActiveMeetSessions(): MeetSession[];
export declare function listRecentMeetSessions(limit?: number): MeetSession[];
export declare function insertAuditLog(agentId: string, chatId: string, action: string, detail: string, blocked: boolean): void;
export interface AuditLogEntry {
    id: number;
    agent_id: string;
    chat_id: string;
    action: string;
    detail: string;
    blocked: number;
    created_at: number;
}
export declare function getAuditLog(limit?: number, offset?: number, agentId?: string): AuditLogEntry[];
export declare function getAuditLogCount(agentId?: string): number;
export declare function getRecentBlockedActions(limit?: number): AuditLogEntry[];
export declare function saveCompactionEvent(sessionId: string, preTokens: number, postTokens: number, turnCount: number): void;
export declare function getCompactionCount(sessionId: string): number;
export declare function getCompactionHistory(sessionId: string): Array<{
    id: number;
    session_id: string;
    pre_tokens: number;
    post_tokens: number;
    turn_count: number;
    created_at: number;
}>;
export declare function getSessionStats(sessionId: string): {
    turnCount: number;
    totalCost: number;
    compactionCount: number;
    maxContextTokens: number;
};
export declare function getLastMemorySaveTime(chatId: string, agentId?: string): number | null;
export declare function getTurnCountSinceTimestamp(chatId: string, sinceTimestamp: number, agentId?: string): number;
export declare function upsertSkillHealth(skillId: string, status: string, errorMsg?: string): void;
export declare function getSkillHealth(skillId: string): {
    status: string;
    error_msg: string;
    last_check: number;
} | undefined;
export declare function getAllSkillHealth(): Array<{
    skill_id: string;
    status: string;
    error_msg: string;
    last_check: number;
}>;
export declare function logSkillUsage(skillId: string, chatId: string, agentId: string, tokensUsed: number, succeeded: boolean): void;
export declare function getSkillUsageStats(): Array<{
    skill_id: string;
    count: number;
    last_used: number;
    total_tokens: number;
}>;
export declare function saveSessionSummary(sessionId: string, summary: string, keyDecisions: string[], turnCount: number, totalCost: number): void;
export declare function getSessionSummary(sessionId: string): {
    summary: string;
    key_decisions: string;
    turn_count: number;
    total_cost: number;
} | undefined;
export declare function createWarRoomMeeting(id: string, mode: string, pinnedAgent: string): void;
export declare function endWarRoomMeeting(id: string, entryCount: number): void;
export declare function addWarRoomTranscript(meetingId: string, speaker: string, text: string): void;
export declare function getWarRoomMeetings(limit?: number): Array<{
    id: string;
    started_at: number;
    ended_at: number | null;
    duration_s: number | null;
    mode: string;
    pinned_agent: string;
    entry_count: number;
}>;
export declare function getWarRoomTranscript(meetingId: string): Array<{
    speaker: string;
    text: string;
    created_at: number;
}>;
//# sourceMappingURL=db.d.ts.map