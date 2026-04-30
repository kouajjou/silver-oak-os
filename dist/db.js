import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { DB_ENCRYPTION_KEY, STORE_DIR } from './config.js';
import { cosineSimilarity } from './embeddings.js';
import { logger } from './logger.js';
// ── Field-Level Encryption (AES-256-GCM) ────────────────────────────
// All message bodies (WhatsApp, Slack) are encrypted before storage
// and decrypted on read. The key lives in .env (DB_ENCRYPTION_KEY).
let encryptionKey = null;
function getEncryptionKey() {
    if (encryptionKey)
        return encryptionKey;
    const hex = DB_ENCRYPTION_KEY;
    if (!hex || hex.length < 32) {
        throw new Error('DB_ENCRYPTION_KEY is missing or too short. Run: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))" and add to .env');
    }
    encryptionKey = Buffer.from(hex, 'hex');
    return encryptionKey;
}
/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns a compact string: iv:authTag:ciphertext (all hex-encoded).
 */
export function encryptField(plaintext) {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}
/**
 * Decrypt a string produced by encryptField().
 * Returns the original plaintext. If decryption fails (wrong key, tampered),
 * returns the raw input unchanged (graceful fallback for pre-encryption data).
 */
export function decryptField(ciphertext) {
    try {
        const parts = ciphertext.split(':');
        if (parts.length !== 3)
            return ciphertext; // Not encrypted, return as-is
        const [ivHex, authTagHex, dataHex] = parts;
        if (!ivHex || !authTagHex || !dataHex)
            return ciphertext;
        const key = getEncryptionKey();
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const data = Buffer.from(dataHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
        return decrypted.toString('utf8');
    }
    catch {
        // Decryption failed: probably pre-encryption plaintext data
        return ciphertext;
    }
}
let db;
function createSchema(database) {
    database.exec(`
    CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id          TEXT PRIMARY KEY,
      prompt      TEXT NOT NULL,
      schedule    TEXT NOT NULL,
      next_run    INTEGER NOT NULL,
      last_run    INTEGER,
      last_result TEXT,
      status      TEXT NOT NULL DEFAULT 'active',
      created_at  INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_next_run ON scheduled_tasks(status, next_run);

    CREATE TABLE IF NOT EXISTS sessions (
      chat_id    TEXT NOT NULL,
      agent_id   TEXT NOT NULL DEFAULT 'main',
      session_id TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (chat_id, agent_id)
    );

    CREATE TABLE IF NOT EXISTS memories (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id       TEXT NOT NULL,
      source        TEXT NOT NULL DEFAULT 'conversation',
      raw_text      TEXT NOT NULL,
      summary       TEXT NOT NULL,
      entities      TEXT NOT NULL DEFAULT '[]',
      topics        TEXT NOT NULL DEFAULT '[]',
      connections   TEXT NOT NULL DEFAULT '[]',
      importance    REAL NOT NULL DEFAULT 0.5,
      salience      REAL NOT NULL DEFAULT 1.0,
      consolidated  INTEGER NOT NULL DEFAULT 0,
      embedding     TEXT,
      created_at    INTEGER NOT NULL,
      accessed_at   INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_memories_chat ON memories(chat_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS consolidations (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id       TEXT NOT NULL,
      source_ids    TEXT NOT NULL,
      summary       TEXT NOT NULL,
      insight       TEXT NOT NULL,
      created_at    INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_consolidations_chat ON consolidations(chat_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS wa_message_map (
      telegram_msg_id INTEGER PRIMARY KEY,
      wa_chat_id      TEXT NOT NULL,
      contact_name    TEXT NOT NULL,
      created_at      INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wa_outbox (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      to_chat_id  TEXT NOT NULL,
      body        TEXT NOT NULL,
      created_at  INTEGER NOT NULL,
      sent_at     INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_wa_outbox_unsent ON wa_outbox(sent_at) WHERE sent_at IS NULL;

    CREATE TABLE IF NOT EXISTS wa_messages (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id      TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      body         TEXT NOT NULL,
      timestamp    INTEGER NOT NULL,
      is_from_me   INTEGER NOT NULL DEFAULT 0,
      created_at   INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_wa_messages_chat ON wa_messages(chat_id, timestamp DESC);

    CREATE TABLE IF NOT EXISTS conversation_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id     TEXT NOT NULL,
      session_id  TEXT,
      role        TEXT NOT NULL,
      content     TEXT NOT NULL,
      created_at  INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_convo_log_chat ON conversation_log(chat_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS token_usage (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id         TEXT NOT NULL,
      session_id      TEXT,
      input_tokens    INTEGER NOT NULL DEFAULT 0,
      output_tokens   INTEGER NOT NULL DEFAULT 0,
      cache_read      INTEGER NOT NULL DEFAULT 0,
      context_tokens  INTEGER NOT NULL DEFAULT 0,
      cost_usd        REAL NOT NULL DEFAULT 0,
      did_compact     INTEGER NOT NULL DEFAULT 0,
      created_at      INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_token_usage_session ON token_usage(session_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_token_usage_chat ON token_usage(chat_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS slack_messages (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id   TEXT NOT NULL,
      channel_name TEXT NOT NULL,
      user_name    TEXT NOT NULL,
      body         TEXT NOT NULL,
      timestamp    TEXT NOT NULL,
      is_from_me   INTEGER NOT NULL DEFAULT 0,
      created_at   INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_slack_messages_channel ON slack_messages(channel_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS hive_mind (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id    TEXT NOT NULL,
      chat_id     TEXT NOT NULL,
      action      TEXT NOT NULL,
      summary     TEXT NOT NULL,
      artifacts   TEXT,
      created_at  INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_hive_mind_agent ON hive_mind(agent_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_hive_mind_time ON hive_mind(created_at DESC);

    CREATE TABLE IF NOT EXISTS inter_agent_tasks (
      id            TEXT PRIMARY KEY,
      from_agent    TEXT NOT NULL,
      to_agent      TEXT NOT NULL,
      chat_id       TEXT NOT NULL,
      prompt        TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'pending',
      result        TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at  TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_inter_agent_tasks_status ON inter_agent_tasks(status, created_at DESC);

    CREATE TABLE IF NOT EXISTS mission_tasks (
      id              TEXT PRIMARY KEY,
      title           TEXT NOT NULL,
      prompt          TEXT NOT NULL,
      assigned_agent  TEXT,
      status          TEXT NOT NULL DEFAULT 'queued',
      result          TEXT,
      error           TEXT,
      created_by      TEXT NOT NULL DEFAULT 'dashboard',
      priority        INTEGER NOT NULL DEFAULT 0,
      created_at      INTEGER NOT NULL,
      started_at      INTEGER,
      completed_at    INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_mission_status
      ON mission_tasks(assigned_agent, status, priority DESC, created_at ASC);

    CREATE TABLE IF NOT EXISTS meet_sessions (
      id              TEXT PRIMARY KEY,         -- session id from the provider's join response
      agent_id        TEXT NOT NULL,            -- which agent is in the meeting
      meet_url        TEXT NOT NULL,
      bot_name        TEXT NOT NULL,
      platform        TEXT NOT NULL DEFAULT 'google_meet',
      provider        TEXT NOT NULL DEFAULT 'pika',  -- pika (avatar) | recall (voice-only)
      status          TEXT NOT NULL DEFAULT 'joining', -- joining | live | left | failed
      voice_id        TEXT,
      image_path      TEXT,                     -- avatar image used for this session (pika only)
      brief_path      TEXT,                     -- path to the frozen system prompt file
      created_at      INTEGER NOT NULL,
      joined_at       INTEGER,
      left_at         INTEGER,
      post_notes      TEXT,                     -- post-meeting notes, fetched after leave
      error           TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_meet_status ON meet_sessions(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_meet_agent ON meet_sessions(agent_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS warroom_meetings (
      id          TEXT PRIMARY KEY,
      started_at  INTEGER NOT NULL,
      ended_at    INTEGER,
      duration_s  INTEGER,
      mode        TEXT NOT NULL DEFAULT 'direct',  -- direct | auto
      pinned_agent TEXT DEFAULT 'main',
      entry_count INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_warroom_meetings_time ON warroom_meetings(started_at DESC);

    CREATE TABLE IF NOT EXISTS warroom_transcript (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id  TEXT NOT NULL,
      speaker     TEXT NOT NULL,     -- 'user' | agent id | 'system'
      text        TEXT NOT NULL,
      created_at  INTEGER NOT NULL,
      FOREIGN KEY (meeting_id) REFERENCES warroom_meetings(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_warroom_transcript_meeting ON warroom_transcript(meeting_id, created_at);

    CREATE TABLE IF NOT EXISTS audit_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id    TEXT NOT NULL DEFAULT 'main',
      chat_id     TEXT NOT NULL DEFAULT '',
      action      TEXT NOT NULL,
      detail      TEXT NOT NULL DEFAULT '',
      blocked     INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
    CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_agent ON audit_log(agent_id, created_at DESC);

    CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
      summary,
      raw_text,
      entities,
      topics,
      content=memories,
      content_rowid=id
    );

    CREATE TRIGGER IF NOT EXISTS memories_fts_insert AFTER INSERT ON memories BEGIN
      INSERT INTO memories_fts(rowid, summary, raw_text, entities, topics)
        VALUES (new.id, new.summary, new.raw_text, new.entities, new.topics);
    END;

    CREATE TRIGGER IF NOT EXISTS memories_fts_delete AFTER DELETE ON memories BEGIN
      INSERT INTO memories_fts(memories_fts, rowid, summary, raw_text, entities, topics)
        VALUES ('delete', old.id, old.summary, old.raw_text, old.entities, old.topics);
    END;

    CREATE TRIGGER IF NOT EXISTS memories_fts_update AFTER UPDATE ON memories BEGIN
      INSERT INTO memories_fts(memories_fts, rowid, summary, raw_text, entities, topics)
        VALUES ('delete', old.id, old.summary, old.raw_text, old.entities, old.topics);
      INSERT INTO memories_fts(rowid, summary, raw_text, entities, topics)
        VALUES (new.id, new.summary, new.raw_text, new.entities, new.topics);
    END;

    -- Phase 2.4: Compaction event tracking
    CREATE TABLE IF NOT EXISTS compaction_events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id  TEXT NOT NULL,
      pre_tokens  INTEGER NOT NULL DEFAULT 0,
      post_tokens INTEGER NOT NULL DEFAULT 0,
      turn_count  INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
    CREATE INDEX IF NOT EXISTS idx_compaction_session ON compaction_events(session_id, created_at DESC);

    -- Phase 4.2: Skill health checks
    CREATE TABLE IF NOT EXISTS skill_health (
      skill_id    TEXT PRIMARY KEY,
      status      TEXT NOT NULL DEFAULT 'unchecked',
      error_msg   TEXT NOT NULL DEFAULT '',
      last_check  INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    -- Phase 4.3: Skill usage analytics
    CREATE TABLE IF NOT EXISTS skill_usage (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      skill_id    TEXT NOT NULL,
      chat_id     TEXT NOT NULL DEFAULT '',
      agent_id    TEXT NOT NULL DEFAULT 'main',
      triggered_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      tokens_used INTEGER NOT NULL DEFAULT 0,
      succeeded   INTEGER NOT NULL DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS idx_skill_usage_skill ON skill_usage(skill_id, triggered_at DESC);

    -- Phase 6.2: Session summaries
    CREATE TABLE IF NOT EXISTS session_summaries (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id  TEXT NOT NULL UNIQUE,
      summary     TEXT NOT NULL,
      key_decisions TEXT NOT NULL DEFAULT '[]',
      turn_count  INTEGER NOT NULL DEFAULT 0,
      total_cost  REAL NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
  `);
}
export function initDatabase() {
    fs.mkdirSync(STORE_DIR, { recursive: true });
    const dbPath = path.join(STORE_DIR, 'claudeclaw.db');
    // Validate encryption key is available before proceeding
    getEncryptionKey();
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    createSchema(db);
    runMigrations(db);
    // Restrict database file permissions (owner-only read/write)
    try {
        for (const suffix of ['', '-wal', '-shm']) {
            const f = dbPath + suffix;
            if (fs.existsSync(f))
                fs.chmodSync(f, 0o600);
        }
        fs.chmodSync(STORE_DIR, 0o700);
    }
    catch { /* non-fatal on platforms that don't support chmod */ }
}
/** Add columns that may not exist in older databases. */
function runMigrations(database) {
    // Add context_tokens column to token_usage (introduced for accurate context tracking)
    const cols = database.prepare(`PRAGMA table_info(token_usage)`).all();
    const hasContextTokens = cols.some((c) => c.name === 'context_tokens');
    if (!hasContextTokens) {
        database.exec(`ALTER TABLE token_usage ADD COLUMN context_tokens INTEGER NOT NULL DEFAULT 0`);
    }
    // Multi-agent: migrate sessions table to composite primary key (chat_id, agent_id)
    // Check if PK is composite by looking at pk column count in pragma
    const sessionCols = database.prepare(`PRAGMA table_info(sessions)`).all();
    const pkCount = sessionCols.filter((c) => c.pk > 0).length;
    if (pkCount < 2) {
        // Need to recreate table with composite PK
        database.exec(`
      CREATE TABLE sessions_new (
        chat_id    TEXT NOT NULL,
        agent_id   TEXT NOT NULL DEFAULT 'main',
        session_id TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (chat_id, agent_id)
      );
      INSERT OR IGNORE INTO sessions_new (chat_id, agent_id, session_id, updated_at)
        SELECT chat_id, COALESCE(agent_id, 'main'), session_id, updated_at FROM sessions;
      DROP TABLE sessions;
      ALTER TABLE sessions_new RENAME TO sessions;
    `);
    }
    const taskCols = database.prepare(`PRAGMA table_info(scheduled_tasks)`).all();
    if (!taskCols.some((c) => c.name === 'agent_id')) {
        database.exec(`ALTER TABLE scheduled_tasks ADD COLUMN agent_id TEXT NOT NULL DEFAULT 'main'`);
    }
    const usageCols = database.prepare(`PRAGMA table_info(token_usage)`).all();
    if (!usageCols.some((c) => c.name === 'agent_id')) {
        database.exec(`ALTER TABLE token_usage ADD COLUMN agent_id TEXT NOT NULL DEFAULT 'main'`);
    }
    const convoCols = database.prepare(`PRAGMA table_info(conversation_log)`).all();
    if (!convoCols.some((c) => c.name === 'agent_id')) {
        database.exec(`ALTER TABLE conversation_log ADD COLUMN agent_id TEXT NOT NULL DEFAULT 'main'`);
    }
    // Task state machine: add started_at and last_status columns
    const taskColNames = taskCols.map((c) => c.name);
    if (!taskColNames.includes('started_at')) {
        database.exec(`ALTER TABLE scheduled_tasks ADD COLUMN started_at INTEGER`);
    }
    if (!taskColNames.includes('last_status')) {
        database.exec(`ALTER TABLE scheduled_tasks ADD COLUMN last_status TEXT`);
    }
    // ── Memory V2 migration ──────────────────────────────────────────────
    // Detect old schema (has 'sector' column but no 'importance') and migrate.
    const memCols = database.prepare(`PRAGMA table_info(memories)`).all();
    const memColNames = memCols.map((c) => c.name);
    const isOldSchema = memColNames.includes('sector') && !memColNames.includes('importance');
    if (isOldSchema) {
        database.exec(`
      -- Drop old FTS triggers first
      DROP TRIGGER IF EXISTS memories_fts_insert;
      DROP TRIGGER IF EXISTS memories_fts_delete;
      DROP TRIGGER IF EXISTS memories_fts_update;

      -- Drop old FTS table
      DROP TABLE IF EXISTS memories_fts;

      -- Drop old indexes (they'll conflict with new table's indexes)
      DROP INDEX IF EXISTS idx_memories_chat;
      DROP INDEX IF EXISTS idx_memories_sector;

      -- Backup old memories table
      ALTER TABLE memories RENAME TO memories_v1_backup;

      -- Create new memories table
      CREATE TABLE memories (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id       TEXT NOT NULL,
        source        TEXT NOT NULL DEFAULT 'conversation',
        raw_text      TEXT NOT NULL,
        summary       TEXT NOT NULL,
        entities      TEXT NOT NULL DEFAULT '[]',
        topics        TEXT NOT NULL DEFAULT '[]',
        connections   TEXT NOT NULL DEFAULT '[]',
        importance    REAL NOT NULL DEFAULT 0.5,
        salience      REAL NOT NULL DEFAULT 1.0,
        consolidated  INTEGER NOT NULL DEFAULT 0,
        embedding     TEXT,
        created_at    INTEGER NOT NULL,
        accessed_at   INTEGER NOT NULL
      );

      CREATE INDEX idx_memories_chat ON memories(chat_id, created_at DESC);
      CREATE INDEX idx_memories_importance ON memories(chat_id, importance DESC);
      CREATE INDEX idx_memories_unconsolidated ON memories(chat_id, consolidated);

      -- Create consolidations table
      CREATE TABLE IF NOT EXISTS consolidations (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id       TEXT NOT NULL,
        source_ids    TEXT NOT NULL,
        summary       TEXT NOT NULL,
        insight       TEXT NOT NULL,
        created_at    INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_consolidations_chat ON consolidations(chat_id, created_at DESC);

      -- Create new FTS table
      CREATE VIRTUAL TABLE memories_fts USING fts5(
        summary,
        raw_text,
        entities,
        topics,
        content=memories,
        content_rowid=id
      );

      -- Create new triggers
      CREATE TRIGGER memories_fts_insert AFTER INSERT ON memories BEGIN
        INSERT INTO memories_fts(rowid, summary, raw_text, entities, topics)
          VALUES (new.id, new.summary, new.raw_text, new.entities, new.topics);
      END;

      CREATE TRIGGER memories_fts_delete AFTER DELETE ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, summary, raw_text, entities, topics)
          VALUES ('delete', old.id, old.summary, old.raw_text, old.entities, old.topics);
      END;

      CREATE TRIGGER memories_fts_update AFTER UPDATE OF summary, raw_text, entities, topics ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, summary, raw_text, entities, topics)
          VALUES ('delete', old.id, old.summary, old.raw_text, old.entities, old.topics);
        INSERT INTO memories_fts(rowid, summary, raw_text, entities, topics)
          VALUES (new.id, new.summary, new.raw_text, new.entities, new.topics);
      END;
    `);
        logger.info('Memory V2 migration: backed up old memories, created new schema');
    }
    // Ensure memory V2 indexes exist (covers both migrated and fresh installs)
    const memColsPost = database.prepare(`PRAGMA table_info(memories)`).all();
    if (memColsPost.some((c) => c.name === 'importance')) {
        database.exec(`
      CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(chat_id, importance DESC);
      CREATE INDEX IF NOT EXISTS idx_memories_unconsolidated ON memories(chat_id, consolidated);
    `);
    }
    // Add embedding column if missing (V2 tables created before embedding support)
    if (memColsPost.some((c) => c.name === 'importance') && !memColsPost.some((c) => c.name === 'embedding')) {
        database.exec(`ALTER TABLE memories ADD COLUMN embedding TEXT`);
        logger.info('Migration: added embedding column to memories table');
    }
    // Hive Mind V2: Add agent_id to memories for attribution
    if (!memColsPost.some((c) => c.name === 'agent_id')) {
        database.exec(`ALTER TABLE memories ADD COLUMN agent_id TEXT NOT NULL DEFAULT 'main'`);
        logger.info('Migration: added agent_id column to memories table');
    }
    // Hive Mind V2: Add embedding + model tracking to consolidations
    const consolCols = database.prepare('PRAGMA table_info(consolidations)').all();
    if (!consolCols.some((c) => c.name === 'embedding')) {
        database.exec(`ALTER TABLE consolidations ADD COLUMN embedding TEXT`);
        logger.info('Migration: added embedding column to consolidations table');
    }
    if (!consolCols.some((c) => c.name === 'embedding_model')) {
        database.exec(`ALTER TABLE consolidations ADD COLUMN embedding_model TEXT DEFAULT 'embedding-001'`);
    }
    // Add embedding_model to memories too (future-proofing)
    if (!memColsPost.some((c) => c.name === 'embedding_model')) {
        database.exec(`ALTER TABLE memories ADD COLUMN embedding_model TEXT DEFAULT 'embedding-001'`);
    }
    // Hive Mind V2: Fix FTS5 update trigger to only fire on content column changes.
    // The old trigger fires on every UPDATE (including salience/importance-only changes),
    // causing massive write amplification during decay sweeps.
    const triggerCheck = database.prepare(`SELECT sql FROM sqlite_master WHERE type='trigger' AND name='memories_fts_update'`).get();
    if (triggerCheck?.sql && !triggerCheck.sql.includes('UPDATE OF')) {
        database.exec(`
      DROP TRIGGER IF EXISTS memories_fts_update;
      CREATE TRIGGER memories_fts_update AFTER UPDATE OF summary, raw_text, entities, topics ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, summary, raw_text, entities, topics)
          VALUES ('delete', old.id, old.summary, old.raw_text, old.entities, old.topics);
        INSERT INTO memories_fts(rowid, summary, raw_text, entities, topics)
          VALUES (new.id, new.summary, new.raw_text, new.entities, new.topics);
      END;
    `);
        logger.info('Migration: restricted FTS5 update trigger to content columns only');
    }
    // Hive Mind V2: Add superseded_by for contradiction resolution
    if (!memColsPost.some((c) => c.name === 'superseded_by')) {
        database.exec(`ALTER TABLE memories ADD COLUMN superseded_by INTEGER REFERENCES memories(id)`);
        logger.info('Migration: added superseded_by column to memories table');
    }
    // Hive Mind V2: Add pinned flag for permanent memories that never decay.
    // Memories are only pinned explicitly by the user ("remember this permanently")
    // or via /pin command. No auto-pinning: the user controls what's permanent.
    if (!memColsPost.some((c) => c.name === 'pinned')) {
        database.exec(`ALTER TABLE memories ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0`);
        logger.info('Migration: added pinned column to memories table');
    }
    // Mission Control: migrate assigned_agent from NOT NULL to nullable (allow unassigned tasks)
    const missionCols = database.prepare(`PRAGMA table_info(mission_tasks)`).all();
    const assignedCol = missionCols.find((c) => c.name === 'assigned_agent');
    if (assignedCol && assignedCol.notnull === 1) {
        database.exec(`
      CREATE TABLE mission_tasks_new (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, prompt TEXT NOT NULL,
        assigned_agent TEXT, status TEXT NOT NULL DEFAULT 'queued',
        result TEXT, error TEXT, created_by TEXT NOT NULL DEFAULT 'dashboard',
        priority INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL,
        started_at INTEGER, completed_at INTEGER
      );
      INSERT INTO mission_tasks_new SELECT * FROM mission_tasks;
      DROP TABLE mission_tasks;
      ALTER TABLE mission_tasks_new RENAME TO mission_tasks;
      CREATE INDEX IF NOT EXISTS idx_mission_status
        ON mission_tasks(assigned_agent, status, priority DESC, created_at ASC);
    `);
        logger.info('Migration: made mission_tasks.assigned_agent nullable');
    }
    // Mission Control: add timeout_ms column for per-task timeout overrides
    const missionCols2 = database.prepare(`PRAGMA table_info(mission_tasks)`).all();
    if (!missionCols2.find((c) => c.name === 'timeout_ms')) {
        database.exec(`ALTER TABLE mission_tasks ADD COLUMN timeout_ms INTEGER`);
        logger.info('Migration: added timeout_ms to mission_tasks');
    }
    // Live Meetings: add provider column so we can track which platform
    // each session used (pika avatar vs recall voice-only). Default 'pika'
    // for existing rows so historical data keeps the right label.
    const meetCols = database.prepare(`PRAGMA table_info(meet_sessions)`).all();
    if (meetCols.length > 0 && !meetCols.some((c) => c.name === 'provider')) {
        database.exec(`ALTER TABLE meet_sessions ADD COLUMN provider TEXT NOT NULL DEFAULT 'pika'`);
        logger.info('Migration: added provider column to meet_sessions');
    }
    // Per-agent dashboard chat: mission tasks now double as the cross-process
    // transport for chat. type='async' keeps the existing one-shot behavior;
    // type='chat' carries chat_id so the executing agent can save its turns
    // under the correct dashboard chat scope. Re-pragma here so we see the
    // timeout_ms column added above — conditional ADD COLUMNs only check
    // for the name they're about to add, so column-order doesn't matter.
    const missionCols3 = database.prepare(`PRAGMA table_info(mission_tasks)`).all();
    if (!missionCols3.find((c) => c.name === 'type')) {
        database.exec(`ALTER TABLE mission_tasks ADD COLUMN type TEXT NOT NULL DEFAULT 'async'`);
        logger.info('Migration: added mission_tasks.type column');
    }
    if (!missionCols3.find((c) => c.name === 'chat_id')) {
        database.exec(`ALTER TABLE mission_tasks ADD COLUMN chat_id TEXT`);
        logger.info('Migration: added mission_tasks.chat_id column');
    }
    // Per-agent conversation queries need an index that matches their WHERE.
    database.exec(`CREATE INDEX IF NOT EXISTS idx_convo_log_chat_agent ON conversation_log(chat_id, agent_id, created_at DESC)`);
}
/** @internal - for tests only. Creates a fresh in-memory database. */
export function _initTestDatabase() {
    // Use a test encryption key for field-level encryption
    encryptionKey = crypto.randomBytes(32);
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    createSchema(db);
    runMigrations(db);
}
export function getSession(chatId, agentId = 'main') {
    const row = db
        .prepare('SELECT session_id FROM sessions WHERE chat_id = ? AND agent_id = ?')
        .get(chatId, agentId);
    return row?.session_id;
}
export function setSession(chatId, sessionId, agentId = 'main') {
    db.prepare('INSERT OR REPLACE INTO sessions (chat_id, agent_id, session_id, updated_at) VALUES (?, ?, ?, ?)').run(chatId, agentId, sessionId, new Date().toISOString());
}
export function clearSession(chatId, agentId = 'main') {
    db.prepare('DELETE FROM sessions WHERE chat_id = ? AND agent_id = ?').run(chatId, agentId);
}
export function saveStructuredMemory(chatId, rawText, summary, entities, topics, importance, source = 'conversation', agentId = 'main') {
    const now = Math.floor(Date.now() / 1000);
    const result = db.prepare(`INSERT INTO memories (chat_id, source, raw_text, summary, entities, topics, importance, agent_id, created_at, accessed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(chatId, source, rawText, summary, JSON.stringify(entities), JSON.stringify(topics), importance, agentId, now, now);
    return result.lastInsertRowid;
}
const STOP_WORDS = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
    'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
    'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
    'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
    'just', 'because', 'but', 'and', 'or', 'if', 'while', 'about',
    'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
    'am', 'it', 'its', 'my', 'me', 'we', 'our', 'you', 'your', 'he',
    'him', 'his', 'she', 'her', 'they', 'them', 'their', 'i', 'up',
    'down', 'get', 'got', 'like', 'make', 'know', 'think', 'take',
    'come', 'go', 'see', 'look', 'find', 'give', 'tell', 'say',
    'much', 'many', 'well', 'also', 'back', 'use', 'way',
    'feel', 'mark', 'marks', 'does', 'how',
]);
/**
 * Extract meaningful keywords from a query, stripping stop words and short tokens.
 */
function extractKeywords(query) {
    return query
        .replace(/[""]/g, '"')
        .replace(/[^\w\s]/g, '')
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}
/**
 * Search memories using embedding similarity (primary) with FTS5/LIKE fallback.
 * The queryEmbedding parameter is optional; if provided, vector search is used first.
 * If not provided (or no embeddings in DB), falls back to keyword search.
 */
export function searchMemories(chatId, query, limit = 5, queryEmbedding, agentId = 'main') {
    // Strategy 1: Vector similarity search (if embedding provided)
    if (queryEmbedding && queryEmbedding.length > 0) {
        const candidates = getMemoriesWithEmbeddings(chatId, agentId);
        if (candidates.length > 0) {
            const scored = candidates
                .map((c) => ({ id: c.id, score: cosineSimilarity(queryEmbedding, c.embedding) }))
                .filter((s) => s.score > 0.3) // minimum similarity threshold
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);
            if (scored.length > 0) {
                const ids = scored.map((s) => s.id);
                const placeholders = ids.map(() => '?').join(',');
                // agent_id is already enforced upstream by getMemoriesWithEmbeddings,
                // but repeat it here so this query is correct on its own.
                const rows = db
                    .prepare(`SELECT * FROM memories WHERE id IN (${placeholders}) AND agent_id = ? AND superseded_by IS NULL`)
                    .all(...ids, agentId);
                // Preserve similarity-score ordering (SQL IN doesn't guarantee order)
                const rowMap = new Map(rows.map((r) => [r.id, r]));
                return ids.map((id) => rowMap.get(id)).filter(Boolean);
            }
        }
    }
    // Strategy 2: FTS5 keyword search with OR
    const keywords = extractKeywords(query);
    if (keywords.length === 0)
        return [];
    // Strip double-quotes from each keyword before wrapping it as an FTS5
    // phrase. Without this, a keyword like `"foo` would produce the
    // malformed fragment `""foo"*` and FTS5 would either error out or, in
    // the worst case, interpret attacker-controlled characters as query
    // operators. Belt-and-braces on top of extractKeywords' own filtering.
    const ftsQuery = keywords.map((w) => `"${w.replace(/"/g, '')}"*`).join(' OR ');
    let results = db
        .prepare(`SELECT memories.* FROM memories
       JOIN memories_fts ON memories.id = memories_fts.rowid
       WHERE memories_fts MATCH ? AND memories.chat_id = ? AND memories.agent_id = ? AND memories.superseded_by IS NULL
       ORDER BY rank
       LIMIT ?`)
        .all(ftsQuery, chatId, agentId, limit);
    if (results.length > 0)
        return results;
    // Strategy 3: LIKE fallback on summary + entities + topics
    const likeConditions = keywords.map(() => `(summary LIKE ? OR entities LIKE ? OR topics LIKE ? OR raw_text LIKE ?)`).join(' OR ');
    const likeParams = [];
    for (const kw of keywords) {
        const pattern = `%${kw}%`;
        likeParams.push(pattern, pattern, pattern, pattern);
    }
    results = db
        .prepare(`SELECT * FROM memories
       WHERE chat_id = ? AND agent_id = ? AND superseded_by IS NULL AND (${likeConditions})
       ORDER BY importance DESC, accessed_at DESC
       LIMIT ?`)
        .all(chatId, agentId, ...likeParams, limit);
    return results;
}
export function saveMemoryEmbedding(memoryId, embedding) {
    db.prepare('UPDATE memories SET embedding = ? WHERE id = ?').run(JSON.stringify(embedding), memoryId);
}
/**
 * Atomically save a structured memory and its embedding in a single transaction.
 * If either step fails, both are rolled back.
 */
export function saveStructuredMemoryAtomic(chatId, rawText, summary, entities, topics, importance, embedding, source = 'conversation', agentId = 'main') {
    const txn = db.transaction(() => {
        const memoryId = saveStructuredMemory(chatId, rawText, summary, entities, topics, importance, source, agentId);
        if (embedding.length > 0) {
            saveMemoryEmbedding(memoryId, embedding);
        }
        return memoryId;
    });
    return txn();
}
export function getMemoriesWithEmbeddings(chatId, agentId = 'main') {
    const rows = db
        .prepare('SELECT id, embedding, summary, importance FROM memories WHERE chat_id = ? AND agent_id = ? AND embedding IS NOT NULL AND superseded_by IS NULL')
        .all(chatId, agentId);
    return rows.map((r) => ({
        id: r.id,
        embedding: JSON.parse(r.embedding),
        summary: r.summary,
        importance: r.importance,
    }));
}
export function getRecentHighImportanceMemories(chatId, limit = 5, agentId = 'main') {
    return db
        .prepare(`SELECT * FROM memories WHERE chat_id = ? AND agent_id = ? AND importance >= 0.5
       ORDER BY accessed_at DESC LIMIT ?`)
        .all(chatId, agentId, limit);
}
export function getRecentMemories(chatId, limit = 5, agentId = 'main') {
    return db
        .prepare('SELECT * FROM memories WHERE chat_id = ? AND agent_id = ? ORDER BY accessed_at DESC LIMIT ?')
        .all(chatId, agentId, limit);
}
export function touchMemory(id) {
    const now = Math.floor(Date.now() / 1000);
    db.prepare('UPDATE memories SET accessed_at = ?, salience = MIN(salience + 0.1, 5.0) WHERE id = ?').run(now, id);
}
export function penalizeMemory(memoryId) {
    db.prepare(`UPDATE memories SET salience = MAX(0.05, salience - 0.05) WHERE id = ?`).run(memoryId);
}
/**
 * Batch-update salience for multiple memories in a single transaction.
 * Reduces SQLite lock contention when multiple agents finish concurrently.
 */
export function batchUpdateMemoryRelevance(allIds, usefulIds) {
    const txn = db.transaction(() => {
        for (const id of allIds) {
            if (usefulIds.has(id)) {
                touchMemory(id);
            }
            else {
                penalizeMemory(id);
            }
        }
    });
    txn();
}
/**
 * Importance-weighted decay. High-importance memories decay slower.
 * Pinned memories are exempt from decay entirely.
 * - pinned:             no decay (permanent)
 * - importance >= 0.8:  1% per day (retains ~460 days)
 * - importance >= 0.5:  2% per day (retains ~230 days)
 * - importance < 0.5:   5% per day (retains ~90 days)
 */
export function decayMemories() {
    const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
    db.prepare(`
    UPDATE memories SET salience = salience * CASE
      WHEN importance >= 0.8 THEN 0.99
      WHEN importance >= 0.5 THEN 0.98
      ELSE 0.95
    END
    WHERE created_at < ? AND pinned = 0
  `).run(oneDayAgo);
    // Clear superseded_by references pointing to memories we're about to delete,
    // otherwise the FOREIGN KEY constraint on superseded_by -> memories(id) fails.
    db.prepare(`
    UPDATE memories SET superseded_by = NULL
    WHERE superseded_by IN (SELECT id FROM memories WHERE salience < 0.05 AND pinned = 0)
  `).run();
    db.prepare('DELETE FROM memories WHERE salience < 0.05 AND pinned = 0').run();
}
export function pinMemory(memoryId) {
    db.prepare('UPDATE memories SET pinned = 1 WHERE id = ?').run(memoryId);
}
export function unpinMemory(memoryId) {
    db.prepare('UPDATE memories SET pinned = 0 WHERE id = ?').run(memoryId);
}
// ── Consolidation CRUD ──────────────────────────────────────────────
export function getUnconsolidatedMemories(chatId, limit = 20) {
    return db
        .prepare(`SELECT * FROM memories WHERE chat_id = ? AND consolidated = 0
       ORDER BY created_at DESC LIMIT ?`)
        .all(chatId, limit);
}
export function saveConsolidation(chatId, sourceIds, summary, insight) {
    const now = Math.floor(Date.now() / 1000);
    const result = db.prepare(`INSERT INTO consolidations (chat_id, source_ids, summary, insight, created_at)
     VALUES (?, ?, ?, ?, ?)`).run(chatId, JSON.stringify(sourceIds), summary, insight, now);
    return result.lastInsertRowid;
}
export function saveConsolidationEmbedding(consolidationId, embedding) {
    db.prepare('UPDATE consolidations SET embedding = ?, embedding_model = ? WHERE id = ?')
        .run(JSON.stringify(embedding), 'embedding-001', consolidationId);
}
export function getConsolidationsWithEmbeddings(chatId) {
    const rows = db
        .prepare('SELECT id, embedding, summary, insight FROM consolidations WHERE chat_id = ? AND embedding IS NOT NULL AND embedding_model = ?')
        .all(chatId, 'embedding-001');
    return rows.map((r) => ({ ...r, embedding: JSON.parse(r.embedding) }));
}
export function supersedeMemory(oldId, newId) {
    db.prepare(`UPDATE memories SET superseded_by = ?, importance = importance * 0.3, salience = salience * 0.5 WHERE id = ?`).run(newId, oldId);
}
export function updateMemoryConnections(memoryId, connections) {
    const row = db.prepare('SELECT connections FROM memories WHERE id = ?').get(memoryId);
    if (!row)
        return;
    const existing = JSON.parse(row.connections);
    const merged = [...existing, ...connections];
    // Deduplicate by linked_to to prevent unbounded growth on re-consolidation
    const seen = new Set();
    const deduped = merged.filter((c) => {
        if (seen.has(c.linked_to))
            return false;
        seen.add(c.linked_to);
        return true;
    });
    db.prepare('UPDATE memories SET connections = ? WHERE id = ?').run(JSON.stringify(deduped), memoryId);
}
export function markMemoriesConsolidated(ids) {
    if (ids.length === 0)
        return;
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`UPDATE memories SET consolidated = 1 WHERE id IN (${placeholders})`).run(...ids);
}
/**
 * Atomically save a consolidation, wire connections, handle contradictions,
 * and mark source memories as consolidated. If any step fails, all roll back.
 */
export function saveConsolidationAtomic(chatId, sourceIds, summary, insight, connections, contradictions) {
    const txn = db.transaction(() => {
        const consolidationId = saveConsolidation(chatId, sourceIds, summary, insight);
        for (const conn of connections) {
            updateMemoryConnections(conn.from_id, [
                { linked_to: conn.to_id, relationship: conn.relationship },
            ]);
            updateMemoryConnections(conn.to_id, [
                { linked_to: conn.from_id, relationship: conn.relationship },
            ]);
        }
        for (const contra of contradictions) {
            supersedeMemory(contra.stale_id, contra.superseded_by);
        }
        markMemoriesConsolidated(sourceIds);
        return consolidationId;
    });
    return txn();
}
export function getRecentConsolidations(chatId, limit = 5) {
    return db
        .prepare(`SELECT * FROM consolidations WHERE chat_id = ?
       ORDER BY created_at DESC LIMIT ?`)
        .all(chatId, limit);
}
export function searchConsolidations(chatId, query, limit = 3) {
    // Simple LIKE search on consolidation summaries and insights
    const pattern = `%${query.replace(/[%_]/g, '')}%`;
    return db
        .prepare(`SELECT * FROM consolidations
       WHERE chat_id = ? AND (summary LIKE ? OR insight LIKE ?)
       ORDER BY created_at DESC LIMIT ?`)
        .all(chatId, pattern, pattern, limit);
}
export function createScheduledTask(id, prompt, schedule, nextRun, agentId = 'main') {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`INSERT INTO scheduled_tasks (id, prompt, schedule, next_run, status, created_at, agent_id)
     VALUES (?, ?, ?, ?, 'active', ?, ?)`).run(id, prompt, schedule, nextRun, now, agentId);
}
export function getDueTasks(agentId = 'main') {
    const now = Math.floor(Date.now() / 1000);
    return db
        .prepare(`SELECT * FROM scheduled_tasks WHERE status = 'active' AND next_run <= ? AND agent_id = ? ORDER BY next_run`)
        .all(now, agentId);
}
export function getAllScheduledTasks(agentId) {
    if (agentId) {
        return db
            .prepare('SELECT * FROM scheduled_tasks WHERE agent_id = ? ORDER BY created_at DESC')
            .all(agentId);
    }
    return db
        .prepare('SELECT * FROM scheduled_tasks ORDER BY created_at DESC')
        .all();
}
/**
 * Mark a task as running and optionally advance its next_run to the next
 * scheduled occurrence. Advancing next_run immediately prevents the scheduler
 * from re-firing the same task on subsequent ticks while it is still executing
 * (double-fire bug), and survives process restarts since the value is persisted.
 */
export function markTaskRunning(id, tentativeNextRun) {
    const now = Math.floor(Date.now() / 1000);
    if (tentativeNextRun !== undefined) {
        db.prepare(`UPDATE scheduled_tasks SET status = 'running', started_at = ?, next_run = ? WHERE id = ?`).run(now, tentativeNextRun, id);
    }
    else {
        db.prepare(`UPDATE scheduled_tasks SET status = 'running', started_at = ? WHERE id = ?`).run(now, id);
    }
}
export function updateTaskAfterRun(id, nextRun, result, lastStatus = 'success') {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`UPDATE scheduled_tasks SET status = 'active', last_run = ?, next_run = ?, last_result = ?, last_status = ?, started_at = NULL WHERE id = ?`).run(now, nextRun, result.slice(0, 4000), lastStatus, id);
}
export function resetStuckTasks(agentId) {
    const result = db.prepare(`UPDATE scheduled_tasks SET status = 'active', started_at = NULL WHERE status = 'running' AND agent_id = ?`).run(agentId);
    return result.changes;
}
export function deleteScheduledTask(id) {
    db.prepare('DELETE FROM scheduled_tasks WHERE id = ?').run(id);
}
export function pauseScheduledTask(id) {
    db.prepare(`UPDATE scheduled_tasks SET status = 'paused' WHERE id = ?`).run(id);
}
export function resumeScheduledTask(id) {
    db.prepare(`UPDATE scheduled_tasks SET status = 'active' WHERE id = ?`).run(id);
}
/**
 * Get recent scheduled task outputs for a given agent.
 * Used to inject context into the next user message so Claude knows
 * what was just shown to the user via a scheduled task.
 *
 * Returns tasks that ran in the last `withinMinutes` (default 30).
 */
export function getRecentTaskOutputs(agentId, withinMinutes = 30) {
    const cutoff = Math.floor(Date.now() / 1000) - withinMinutes * 60;
    return db
        .prepare(`SELECT prompt, last_result, last_run FROM scheduled_tasks
       WHERE agent_id = ? AND last_status = 'success' AND last_run > ?
       ORDER BY last_run DESC LIMIT 3`)
        .all(agentId, cutoff);
}
// ── WhatsApp message map ──────────────────────────────────────────────
export function saveWaMessageMap(telegramMsgId, waChatId, contactName) {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`INSERT OR REPLACE INTO wa_message_map (telegram_msg_id, wa_chat_id, contact_name, created_at)
     VALUES (?, ?, ?, ?)`).run(telegramMsgId, waChatId, contactName, now);
}
export function lookupWaChatId(telegramMsgId) {
    const row = db
        .prepare('SELECT wa_chat_id, contact_name FROM wa_message_map WHERE telegram_msg_id = ?')
        .get(telegramMsgId);
    if (!row)
        return null;
    return { waChatId: row.wa_chat_id, contactName: row.contact_name };
}
export function getRecentWaContacts(limit = 20) {
    const rows = db.prepare(`SELECT wa_chat_id, contact_name, MAX(created_at) as lastSeen
     FROM wa_message_map
     GROUP BY wa_chat_id
     ORDER BY lastSeen DESC
     LIMIT ?`).all(limit);
    return rows.map((r) => ({ waChatId: r.wa_chat_id, contactName: r.contact_name, lastSeen: r.lastSeen }));
}
export function enqueueWaMessage(toChatId, body) {
    const now = Math.floor(Date.now() / 1000);
    const result = db.prepare(`INSERT INTO wa_outbox (to_chat_id, body, created_at) VALUES (?, ?, ?)`).run(toChatId, encryptField(body), now);
    return result.lastInsertRowid;
}
export function getPendingWaMessages() {
    const rows = db.prepare(`SELECT id, to_chat_id, body, created_at FROM wa_outbox WHERE sent_at IS NULL ORDER BY created_at`).all();
    return rows.map((r) => ({ ...r, body: decryptField(r.body) }));
}
export function markWaMessageSent(id) {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`UPDATE wa_outbox SET sent_at = ? WHERE id = ?`).run(now, id);
}
// ── WhatsApp messages ────────────────────────────────────────────────
/**
 * Prune WhatsApp messages older than the given number of days.
 * Covers wa_messages, wa_outbox (sent only), and wa_message_map.
 */
export function pruneWaMessages(retentionDays = 3) {
    const cutoff = Math.floor(Date.now() / 1000) - retentionDays * 86400;
    const msgResult = db.prepare('DELETE FROM wa_messages WHERE created_at < ?').run(cutoff);
    const outboxResult = db.prepare('DELETE FROM wa_outbox WHERE sent_at IS NOT NULL AND created_at < ?').run(cutoff);
    const mapResult = db.prepare('DELETE FROM wa_message_map WHERE created_at < ?').run(cutoff);
    return {
        messages: msgResult.changes,
        outbox: outboxResult.changes,
        map: mapResult.changes,
    };
}
/**
 * Prune Slack messages older than the given number of days.
 */
export function pruneSlackMessages(retentionDays = 3) {
    const cutoff = Math.floor(Date.now() / 1000) - retentionDays * 86400;
    const result = db.prepare('DELETE FROM slack_messages WHERE created_at < ?').run(cutoff);
    return result.changes;
}
export function logConversationTurn(chatId, role, content, sessionId, agentId = 'main') {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`INSERT INTO conversation_log (chat_id, session_id, role, content, created_at, agent_id)
     VALUES (?, ?, ?, ?, ?, ?)`).run(chatId, sessionId ?? null, role, content, now, agentId);
}
export function getRecentConversation(chatId, limit = 20, agentId) {
    // IMPORTANT: filter by agent_id too. Without this, /respin in the main
    // agent bleeds in turns from research/comms/content/ops that share the
    // same chat_id, producing respins contaminated with other agents'
    // conversations. Reported by Benjamin Elkrieff in April 2026.
    if (agentId) {
        return db
            .prepare(`SELECT * FROM conversation_log
         WHERE chat_id = ? AND agent_id = ?
         ORDER BY created_at DESC, id DESC LIMIT ?`)
            .all(chatId, agentId, limit);
    }
    return db
        .prepare(`SELECT * FROM conversation_log WHERE chat_id = ?
       ORDER BY created_at DESC, id DESC LIMIT ?`)
        .all(chatId, limit);
}
/**
 * Search conversation_log by keywords. Used when the user asks about
 * past conversations ("remember when we...", "what did we talk about").
 * Returns recent turns that match any keyword, grouped chronologically.
 */
export function searchConversationHistory(chatId, query, agentId, daysBack = 7, limit = 20) {
    const cutoff = Math.floor(Date.now() / 1000) - (daysBack * 86400);
    const keywords = query
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 3)
        .slice(0, 8);
    if (keywords.length === 0)
        return [];
    const conditions = keywords.map(() => 'content LIKE ?').join(' OR ');
    const params = [chatId, cutoff];
    for (const kw of keywords) {
        params.push(`%${kw}%`);
    }
    const agentFilter = agentId ? ' AND agent_id = ?' : '';
    if (agentId)
        params.push(agentId);
    return db
        .prepare(`SELECT * FROM conversation_log
       WHERE chat_id = ? AND created_at > ? AND (${conditions})${agentFilter}
       ORDER BY created_at DESC LIMIT ?`)
        .all(...params, limit);
}
/**
 * Get a page of conversation turns for the dashboard chat overlay.
 * Returns turns in reverse chronological order (newest first).
 * Use `beforeId` for cursor-based pagination (load older messages).
 */
export function getConversationPage(chatId, limit = 40, beforeId, agentId) {
    if (beforeId && agentId) {
        return db
            .prepare(`SELECT * FROM conversation_log
         WHERE chat_id = ? AND agent_id = ? AND id < ?
         ORDER BY id DESC LIMIT ?`)
            .all(chatId, agentId, beforeId, limit);
    }
    if (beforeId) {
        return db
            .prepare(`SELECT * FROM conversation_log
         WHERE chat_id = ? AND id < ?
         ORDER BY id DESC LIMIT ?`)
            .all(chatId, beforeId, limit);
    }
    if (agentId) {
        return db
            .prepare(`SELECT * FROM conversation_log
         WHERE chat_id = ? AND agent_id = ?
         ORDER BY id DESC LIMIT ?`)
            .all(chatId, agentId, limit);
    }
    return db
        .prepare(`SELECT * FROM conversation_log
       WHERE chat_id = ?
       ORDER BY id DESC LIMIT ?`)
        .all(chatId, limit);
}
/**
 * Prune old conversation_log entries, keeping only the most recent N rows
 * per (chat_id, agent_id) pair. Scoping by agent matters because all five
 * agents share the same chat_id in a typical install, and a chatty agent
 * could otherwise evict a quieter agent's history under the shared cap.
 * Wrapped in a transaction so a mid-loop crash can't leave the table in a
 * half-pruned state.
 */
export function pruneConversationLog(keepPerChat = 500) {
    const pairs = db
        .prepare('SELECT DISTINCT chat_id, agent_id FROM conversation_log')
        .all();
    const deleteStmt = db.prepare(`
    DELETE FROM conversation_log
    WHERE chat_id = ? AND agent_id = ? AND id NOT IN (
      SELECT id FROM conversation_log
      WHERE chat_id = ? AND agent_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    )
  `);
    const runAll = db.transaction((rows) => {
        for (const row of rows) {
            deleteStmt.run(row.chat_id, row.agent_id, row.chat_id, row.agent_id, keepPerChat);
        }
    });
    runAll(pairs);
}
// ── WhatsApp messages ────────────────────────────────────────────────
export function saveWaMessage(chatId, contactName, body, timestamp, isFromMe) {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`INSERT INTO wa_messages (chat_id, contact_name, body, timestamp, is_from_me, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`).run(chatId, contactName, encryptField(body), timestamp, isFromMe ? 1 : 0, now);
}
export function getRecentWaMessages(chatId, limit = 20) {
    const rows = db
        .prepare(`SELECT * FROM wa_messages WHERE chat_id = ?
       ORDER BY timestamp DESC LIMIT ?`)
        .all(chatId, limit);
    return rows.map((r) => ({ ...r, body: decryptField(r.body) }));
}
// ── Slack messages ────────────────────────────────────────────────
export function saveSlackMessage(channelId, channelName, userName, body, timestamp, isFromMe) {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`INSERT INTO slack_messages (channel_id, channel_name, user_name, body, timestamp, is_from_me, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`).run(channelId, channelName, userName, encryptField(body), timestamp, isFromMe ? 1 : 0, now);
}
export function getRecentSlackMessages(channelId, limit = 20) {
    const rows = db
        .prepare(`SELECT * FROM slack_messages WHERE channel_id = ?
       ORDER BY created_at DESC LIMIT ?`)
        .all(channelId, limit);
    return rows.map((r) => ({ ...r, body: decryptField(r.body) }));
}
// ── Token Usage ──────────────────────────────────────────────────────
export function saveTokenUsage(chatId, sessionId, inputTokens, outputTokens, cacheRead, contextTokens, costUsd, didCompact, agentId = 'main') {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`INSERT INTO token_usage (chat_id, session_id, input_tokens, output_tokens, cache_read, context_tokens, cost_usd, did_compact, created_at, agent_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(chatId, sessionId ?? null, inputTokens, outputTokens, cacheRead, contextTokens, costUsd, didCompact ? 1 : 0, now, agentId);
}
export function getDashboardMemoryStats(chatId) {
    const counts = db
        .prepare(`SELECT
         COUNT(*) as total,
         AVG(importance) as avgImportance,
         AVG(salience) as avgSalience
       FROM memories WHERE chat_id = ?`)
        .get(chatId);
    const consolidationCount = db
        .prepare('SELECT COUNT(*) as cnt FROM consolidations WHERE chat_id = ?')
        .get(chatId);
    const pinnedCount = db
        .prepare('SELECT COUNT(*) as cnt FROM memories WHERE chat_id = ? AND pinned = 1')
        .get(chatId);
    const buckets = db
        .prepare(`SELECT
         CASE
           WHEN importance < 0.2 THEN '0-0.2'
           WHEN importance < 0.4 THEN '0.2-0.4'
           WHEN importance < 0.6 THEN '0.4-0.6'
           WHEN importance < 0.8 THEN '0.6-0.8'
           ELSE '0.8-1.0'
         END as bucket,
         COUNT(*) as count
       FROM memories WHERE chat_id = ?
       GROUP BY bucket
       ORDER BY bucket`)
        .all(chatId);
    return {
        total: counts.total,
        pinned: pinnedCount.cnt,
        consolidations: consolidationCount.cnt,
        avgImportance: counts.avgImportance ?? 0,
        avgSalience: counts.avgSalience ?? 0,
        importanceDistribution: buckets,
    };
}
export function getDashboardPinnedMemories(chatId) {
    return db
        .prepare('SELECT * FROM memories WHERE chat_id = ? AND pinned = 1 ORDER BY importance DESC')
        .all(chatId);
}
export function getDashboardLowSalienceMemories(chatId, limit = 10) {
    return db
        .prepare(`SELECT * FROM memories WHERE chat_id = ? AND salience < 0.5
       ORDER BY salience ASC LIMIT ?`)
        .all(chatId, limit);
}
export function getDashboardTopAccessedMemories(chatId, limit = 5) {
    return db
        .prepare(`SELECT * FROM memories WHERE chat_id = ? AND importance >= 0.5
       ORDER BY accessed_at DESC LIMIT ?`)
        .all(chatId, limit);
}
export function getDashboardMemoryTimeline(chatId, days = 30) {
    return db
        .prepare(`SELECT
         date(created_at, 'unixepoch') as date,
         COUNT(*) as count
       FROM memories
       WHERE chat_id = ? AND created_at >= unixepoch('now', ?)
       GROUP BY date
       ORDER BY date`)
        .all(chatId, `-${days} days`);
}
export function getDashboardConsolidations(chatId, limit = 5) {
    return getRecentConsolidations(chatId, limit);
}
export function getDashboardTokenStats(chatId) {
    const today = db
        .prepare(`SELECT
         COALESCE(SUM(input_tokens), 0) as todayInput,
         COALESCE(SUM(output_tokens), 0) as todayOutput,
         COALESCE(SUM(cost_usd), 0) as todayCost,
         COUNT(*) as todayTurns
       FROM token_usage
       WHERE chat_id = ? AND created_at >= unixepoch('now', 'start of day')`)
        .get(chatId);
    const allTime = db
        .prepare(`SELECT
         COALESCE(SUM(input_tokens), 0) as allTimeInput,
         COALESCE(SUM(output_tokens), 0) as allTimeOutput,
         COALESCE(SUM(cost_usd), 0) as allTimeCost,
         COUNT(*) as allTimeTurns
       FROM token_usage WHERE chat_id = ?`)
        .get(chatId);
    return { ...today, ...allTime };
}
export function getDashboardCostTimeline(chatId, days = 30) {
    return db
        .prepare(`SELECT
         date(created_at, 'unixepoch') as date,
         SUM(cost_usd) as cost,
         COUNT(*) as turns
       FROM token_usage
       WHERE chat_id = ? AND created_at >= unixepoch('now', ?)
       GROUP BY date
       ORDER BY date`)
        .all(chatId, `-${days} days`);
}
export function getDashboardRecentTokenUsage(chatId, limit = 20) {
    return db
        .prepare(`SELECT * FROM token_usage WHERE chat_id = ?
       ORDER BY created_at DESC LIMIT ?`)
        .all(chatId, limit);
}
export function getDashboardMemoriesList(chatId, limit = 50, offset = 0, sortBy = 'importance') {
    const total = db
        .prepare('SELECT COUNT(*) as cnt FROM memories WHERE chat_id = ?')
        .get(chatId);
    let orderClause;
    switch (sortBy) {
        case 'salience':
            orderClause = 'ORDER BY salience DESC, created_at DESC';
            break;
        case 'recent':
            orderClause = 'ORDER BY created_at DESC';
            break;
        default:
            orderClause = 'ORDER BY importance DESC, created_at DESC';
    }
    const memories = db
        .prepare(`SELECT * FROM memories WHERE chat_id = ? ${orderClause} LIMIT ? OFFSET ?`)
        .all(chatId, limit, offset);
    return { memories, total: total.cnt };
}
export function logToHiveMind(agentId, chatId, action, summary, artifacts) {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`INSERT INTO hive_mind (agent_id, chat_id, action, summary, artifacts, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`).run(agentId, chatId, action, summary, artifacts ?? null, now);
}
export function getHiveMindEntries(limit = 20, agentId) {
    if (agentId) {
        return db
            .prepare('SELECT * FROM hive_mind WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?')
            .all(agentId, limit);
    }
    return db
        .prepare('SELECT * FROM hive_mind ORDER BY created_at DESC LIMIT ?')
        .all(limit);
}
/**
 * Get recent hive_mind entries from agents OTHER than the given one.
 * Used to give each agent awareness of what teammates have been doing.
 */
export function getOtherAgentActivity(excludeAgentId, hoursBack = 24, limit = 10) {
    const cutoff = Math.floor(Date.now() / 1000) - (hoursBack * 3600);
    return db
        .prepare(`SELECT * FROM hive_mind
       WHERE agent_id != ? AND created_at > ?
       ORDER BY created_at DESC LIMIT ?`)
        .all(excludeAgentId, cutoff, limit);
}
/**
 * Get conversation turns for a specific session, ordered chronologically.
 * Used for hive-mind auto-commit on session end.
 */
export function getSessionConversation(sessionId, limit = 40) {
    return db
        .prepare(`SELECT * FROM conversation_log WHERE session_id = ?
       ORDER BY created_at ASC LIMIT ?`)
        .all(sessionId, limit);
}
export function getAgentTokenStats(agentId) {
    const today = db
        .prepare(`SELECT COALESCE(SUM(cost_usd), 0) as todayCost, COUNT(*) as todayTurns
       FROM token_usage
       WHERE agent_id = ? AND created_at >= unixepoch('now', 'start of day')`)
        .get(agentId);
    const allTime = db
        .prepare('SELECT COALESCE(SUM(cost_usd), 0) as allTimeCost FROM token_usage WHERE agent_id = ?')
        .get(agentId);
    return { ...today, allTimeCost: allTime.allTimeCost };
}
export function getAgentRecentConversation(agentId, chatId, limit = 4) {
    return db
        .prepare(`SELECT * FROM conversation_log WHERE agent_id = ? AND chat_id = ?
       ORDER BY created_at DESC, id DESC LIMIT ?`)
        .all(agentId, chatId, limit);
}
export function getSessionTokenUsage(sessionId) {
    const row = db
        .prepare(`SELECT
         COUNT(*)           as turns,
         SUM(input_tokens)  as totalInputTokens,
         SUM(output_tokens) as totalOutputTokens,
         SUM(cost_usd)      as totalCostUsd,
         SUM(did_compact)   as compactions,
         MIN(created_at)    as firstTurnAt,
         MAX(created_at)    as lastTurnAt
       FROM token_usage WHERE session_id = ?`)
        .get(sessionId);
    if (!row || row.turns === 0)
        return null;
    // Get the most recent turn's context_tokens (actual context window size from last API call)
    // Falls back to cache_read for backward compat with rows before the migration
    const lastRow = db
        .prepare(`SELECT cache_read, context_tokens FROM token_usage
       WHERE session_id = ?
       ORDER BY created_at DESC LIMIT 1`)
        .get(sessionId);
    return {
        turns: row.turns,
        totalInputTokens: row.totalInputTokens,
        totalOutputTokens: row.totalOutputTokens,
        lastCacheRead: lastRow?.cache_read ?? 0,
        lastContextTokens: lastRow?.context_tokens ?? lastRow?.cache_read ?? 0,
        totalCostUsd: row.totalCostUsd,
        compactions: row.compactions,
        firstTurnAt: row.firstTurnAt,
        lastTurnAt: row.lastTurnAt,
    };
}
export function createInterAgentTask(id, fromAgent, toAgent, chatId, prompt) {
    db.prepare(`INSERT INTO inter_agent_tasks (id, from_agent, to_agent, chat_id, prompt, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))`).run(id, fromAgent, toAgent, chatId, prompt);
}
export function completeInterAgentTask(id, status, result) {
    db.prepare(`UPDATE inter_agent_tasks SET status = ?, result = ?, completed_at = datetime('now') WHERE id = ?`).run(status, result?.slice(0, 2000) ?? null, id);
}
export function getInterAgentTasks(limit = 20, status) {
    if (status) {
        return db
            .prepare('SELECT * FROM inter_agent_tasks WHERE status = ? ORDER BY created_at DESC LIMIT ?')
            .all(status, limit);
    }
    return db
        .prepare('SELECT * FROM inter_agent_tasks ORDER BY created_at DESC LIMIT ?')
        .all(limit);
}
export function createMissionTask(id, title, prompt, assignedAgent = null, createdBy = 'dashboard', priority = 0, timeoutMs = null, type = 'async', chatId = null) {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`INSERT INTO mission_tasks (id, title, prompt, assigned_agent, status, created_by, priority, timeout_ms, type, chat_id, created_at)
     VALUES (?, ?, ?, ?, 'queued', ?, ?, ?, ?, ?, ?)`).run(id, title, prompt, assignedAgent, createdBy, priority, timeoutMs, type, chatId, now);
}
export function updateMissionTaskTimeout(id, timeoutMs) {
    // Only mutate non-terminal rows. A PATCH racing against a just-completed
    // task must not silently rewrite the timeout after the run has ended.
    const result = db.prepare(`UPDATE mission_tasks SET timeout_ms = ?
       WHERE id = ? AND status IN ('queued', 'running')`).run(timeoutMs, id);
    return result.changes > 0;
}
export function getUnassignedMissionTasks() {
    return db
        .prepare(`SELECT * FROM mission_tasks
       WHERE assigned_agent IS NULL AND status = 'queued' AND type = 'async'
       ORDER BY priority DESC, created_at ASC`)
        .all();
}
/**
 * List mission tasks for the Mission Control UI. Chat-type tasks are the
 * transport for dashboard per-agent chat and are excluded by default so
 * they don't pollute the task list. Pass `includeChat: true` for debug.
 */
export function getMissionTasks(agentId, status, includeChat = false) {
    const conditions = [];
    const params = [];
    if (agentId) {
        conditions.push('assigned_agent = ?');
        params.push(agentId);
    }
    if (status) {
        conditions.push('status = ?');
        params.push(status);
    }
    if (!includeChat) {
        conditions.push("type = 'async'");
    }
    const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
    return db
        .prepare(`SELECT * FROM mission_tasks${where}
       ORDER BY
         CASE status WHEN 'running' THEN 0 WHEN 'queued' THEN 1 ELSE 2 END,
         priority DESC, created_at DESC`)
        .all(...params);
}
export function getMissionTask(id) {
    return db.prepare('SELECT * FROM mission_tasks WHERE id = ?').get(id) ?? null;
}
export function claimNextMissionTask(agentId) {
    const txn = db.transaction(() => {
        const task = db
            .prepare(`SELECT * FROM mission_tasks
         WHERE assigned_agent = ? AND status = 'queued'
         ORDER BY priority DESC, created_at ASC
         LIMIT 1`)
            .get(agentId);
        if (!task)
            return null;
        db.prepare(`UPDATE mission_tasks SET status = 'running', started_at = ? WHERE id = ?`).run(Math.floor(Date.now() / 1000), task.id);
        return { ...task, status: 'running', started_at: Math.floor(Date.now() / 1000) };
    });
    return txn();
}
export function completeMissionTask(id, result, status, error) {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`UPDATE mission_tasks SET status = ?, result = ?, error = ?, completed_at = ? WHERE id = ?`).run(status, result, error ?? null, now, id);
}
export function cancelMissionTask(id) {
    const result = db.prepare(`UPDATE mission_tasks SET status = 'cancelled', completed_at = ? WHERE id = ? AND status IN ('queued', 'running')`).run(Math.floor(Date.now() / 1000), id);
    return result.changes > 0;
}
export function deleteMissionTask(id) {
    const result = db.prepare(`DELETE FROM mission_tasks WHERE id = ? AND status IN ('completed', 'cancelled', 'failed')`).run(id);
    return result.changes > 0;
}
export function cleanupOldMissionTasks(olderThanDays = 7) {
    const cutoff = Math.floor(Date.now() / 1000) - olderThanDays * 86400;
    const result = db.prepare(`DELETE FROM mission_tasks WHERE status IN ('completed', 'cancelled', 'failed') AND completed_at < ?`).run(cutoff);
    return result.changes;
}
export function reassignMissionTask(id, newAgent) {
    const result = db.prepare(`UPDATE mission_tasks SET assigned_agent = ? WHERE id = ? AND status = 'queued'`).run(newAgent, id);
    return result.changes > 0;
}
export function assignMissionTask(id, agent) {
    const result = db.prepare(`UPDATE mission_tasks SET assigned_agent = ? WHERE id = ? AND assigned_agent IS NULL AND status = 'queued'`).run(agent, id);
    return result.changes > 0;
}
export function getMissionTaskHistory(limit = 30, offset = 0) {
    // Exclude chat-type tasks — they're dashboard-scoped chat turns, not
    // Mission Control work items. Showing them would pollute the history view.
    const total = db.prepare(`SELECT COUNT(*) as c FROM mission_tasks
       WHERE status IN ('completed', 'failed', 'cancelled')
         AND (type IS NULL OR type = 'async')`).get().c;
    const tasks = db.prepare(`SELECT * FROM mission_tasks
       WHERE status IN ('completed', 'failed', 'cancelled')
         AND (type IS NULL OR type = 'async')
     ORDER BY completed_at DESC LIMIT ? OFFSET ?`).all(limit, offset);
    return { tasks, total };
}
export function resetStuckMissionTasks(agentId) {
    const result = db.prepare(`UPDATE mission_tasks SET status = 'queued', started_at = NULL WHERE status = 'running' AND assigned_agent = ?`).run(agentId);
    return result.changes;
}
export function createMeetSession(session) {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`INSERT INTO meet_sessions (id, agent_id, meet_url, bot_name, platform, provider, status, voice_id, image_path, brief_path, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'joining', ?, ?, ?, ?)`).run(session.id, session.agentId, session.meetUrl, session.botName, session.platform ?? 'google_meet', session.provider ?? 'pika', session.voiceId ?? null, session.imagePath ?? null, session.briefPath ?? null, now);
}
export function markMeetSessionLive(id) {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`UPDATE meet_sessions SET status = 'live', joined_at = ? WHERE id = ?`).run(now, id);
}
export function markMeetSessionLeft(id, postNotes) {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`UPDATE meet_sessions SET status = 'left', left_at = ?, post_notes = ? WHERE id = ?`).run(now, postNotes ?? null, id);
}
export function markMeetSessionFailed(id, error) {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`UPDATE meet_sessions SET status = 'failed', left_at = ?, error = ? WHERE id = ?`).run(now, error.slice(0, 2000), id);
}
export function getMeetSession(id) {
    return db.prepare('SELECT * FROM meet_sessions WHERE id = ?').get(id) ?? null;
}
export function listActiveMeetSessions() {
    return db.prepare(`SELECT * FROM meet_sessions WHERE status IN ('joining', 'live') ORDER BY created_at DESC`).all();
}
export function listRecentMeetSessions(limit = 20) {
    return db.prepare(`SELECT * FROM meet_sessions ORDER BY created_at DESC LIMIT ?`).all(limit);
}
// ── Audit Log ────────────────────────────────────────────────────────
export function insertAuditLog(agentId, chatId, action, detail, blocked) {
    db.prepare(`INSERT INTO audit_log (agent_id, chat_id, action, detail, blocked, created_at) VALUES (?, ?, ?, ?, ?, strftime('%s','now'))`).run(agentId, chatId, action, detail.slice(0, 2000), blocked ? 1 : 0);
}
export function getAuditLog(limit = 50, offset = 0, agentId) {
    if (agentId) {
        return db.prepare(`SELECT * FROM audit_log WHERE agent_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(agentId, limit, offset);
    }
    return db.prepare(`SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(limit, offset);
}
export function getAuditLogCount(agentId) {
    if (agentId) {
        return db.prepare('SELECT COUNT(*) as c FROM audit_log WHERE agent_id = ?').get(agentId).c;
    }
    return db.prepare('SELECT COUNT(*) as c FROM audit_log').get().c;
}
export function getRecentBlockedActions(limit = 10) {
    return db.prepare(`SELECT * FROM audit_log WHERE blocked = 1 ORDER BY created_at DESC LIMIT ?`).all(limit);
}
// ── Phase 2: Compaction events ────────────────────────────────────────
export function saveCompactionEvent(sessionId, preTokens, postTokens, turnCount) {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`INSERT INTO compaction_events (session_id, pre_tokens, post_tokens, turn_count, created_at)
     VALUES (?, ?, ?, ?, ?)`).run(sessionId, preTokens, postTokens, turnCount, now);
}
export function getCompactionCount(sessionId) {
    return db.prepare('SELECT COUNT(*) as c FROM compaction_events WHERE session_id = ?').get(sessionId).c;
}
export function getCompactionHistory(sessionId) {
    return db.prepare('SELECT * FROM compaction_events WHERE session_id = ? ORDER BY created_at DESC').all(sessionId);
}
// ── Phase 2: Session stats for /convolife ──────────────────────────────
export function getSessionStats(sessionId) {
    const stats = db.prepare(`
    SELECT
      COUNT(*) as turnCount,
      COALESCE(SUM(cost_usd), 0) as totalCost,
      COALESCE(SUM(did_compact), 0) as compactionCount,
      COALESCE(MAX(context_tokens), 0) as maxContextTokens
    FROM token_usage WHERE session_id = ?
  `).get(sessionId);
    return stats ?? { turnCount: 0, totalCost: 0, compactionCount: 0, maxContextTokens: 0 };
}
// ── Phase 2: Memory nudge support ──────────────────────────────────────
export function getLastMemorySaveTime(chatId, agentId = 'main') {
    const row = db.prepare('SELECT created_at FROM memories WHERE chat_id = ? AND agent_id = ? ORDER BY created_at DESC LIMIT 1').get(chatId, agentId);
    return row?.created_at ?? null;
}
export function getTurnCountSinceTimestamp(chatId, sinceTimestamp, agentId = 'main') {
    const row = db.prepare('SELECT COUNT(*) as c FROM conversation_log WHERE chat_id = ? AND agent_id = ? AND role = ? AND created_at > ?').get(chatId, agentId, 'user', sinceTimestamp);
    return row.c;
}
// ── Phase 4: Skill health & usage ────────────────────────────────────
export function upsertSkillHealth(skillId, status, errorMsg = '') {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
    INSERT INTO skill_health (skill_id, status, error_msg, last_check, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(skill_id) DO UPDATE SET status = ?, error_msg = ?, last_check = ?
  `).run(skillId, status, errorMsg, now, now, status, errorMsg, now);
}
export function getSkillHealth(skillId) {
    return db.prepare('SELECT status, error_msg, last_check FROM skill_health WHERE skill_id = ?')
        .get(skillId);
}
export function getAllSkillHealth() {
    return db.prepare('SELECT * FROM skill_health ORDER BY skill_id').all();
}
export function logSkillUsage(skillId, chatId, agentId, tokensUsed, succeeded) {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`INSERT INTO skill_usage (skill_id, chat_id, agent_id, triggered_at, tokens_used, succeeded)
     VALUES (?, ?, ?, ?, ?, ?)`).run(skillId, chatId, agentId, now, tokensUsed, succeeded ? 1 : 0);
}
export function getSkillUsageStats() {
    return db.prepare(`
    SELECT skill_id,
           COUNT(*) as count,
           MAX(triggered_at) as last_used,
           SUM(tokens_used) as total_tokens
    FROM skill_usage
    GROUP BY skill_id
    ORDER BY count DESC
  `).all();
}
// ── Phase 6: Session summaries ────────────────────────────────────────
export function saveSessionSummary(sessionId, summary, keyDecisions, turnCount, totalCost) {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
    INSERT INTO session_summaries (session_id, summary, key_decisions, turn_count, total_cost, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET summary = ?, key_decisions = ?, turn_count = ?, total_cost = ?, created_at = ?
  `).run(sessionId, summary, JSON.stringify(keyDecisions), turnCount, totalCost, now, summary, JSON.stringify(keyDecisions), turnCount, totalCost, now);
}
export function getSessionSummary(sessionId) {
    return db.prepare('SELECT summary, key_decisions, turn_count, total_cost FROM session_summaries WHERE session_id = ?')
        .get(sessionId);
}
// ── War Room meeting history ─────────────────────────────────────────────
export function createWarRoomMeeting(id, mode, pinnedAgent) {
    db.prepare('INSERT OR IGNORE INTO warroom_meetings (id, started_at, mode, pinned_agent) VALUES (?, ?, ?, ?)').run(id, Math.floor(Date.now() / 1000), mode, pinnedAgent);
}
export function endWarRoomMeeting(id, entryCount) {
    const now = Math.floor(Date.now() / 1000);
    db.prepare('UPDATE warroom_meetings SET ended_at = ?, duration_s = ended_at - started_at, entry_count = ? WHERE id = ?').run(now, entryCount, id);
    // Actually compute duration correctly
    db.prepare('UPDATE warroom_meetings SET duration_s = ? - started_at WHERE id = ?').run(now, id);
}
export function addWarRoomTranscript(meetingId, speaker, text) {
    db.prepare('INSERT INTO warroom_transcript (meeting_id, speaker, text, created_at) VALUES (?, ?, ?, ?)').run(meetingId, speaker, text, Math.floor(Date.now() / 1000));
}
export function getWarRoomMeetings(limit = 20) {
    return db.prepare('SELECT * FROM warroom_meetings ORDER BY started_at DESC LIMIT ?').all(limit);
}
export function getWarRoomTranscript(meetingId) {
    return db.prepare('SELECT speaker, text, created_at FROM warroom_transcript WHERE meeting_id = ? ORDER BY created_at').all(meetingId);
}
//# sourceMappingURL=db.js.map