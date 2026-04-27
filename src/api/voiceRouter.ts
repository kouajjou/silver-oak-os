/**
 * Voice API Server — Silver Oak OS
 *
 * Standalone Hono server on port VOICE_API_PORT (default 3000).
 * Provides HTTP endpoints for chat, TTS, STT, and agent listing.
 *
 * Security: all routes except /api/voice/health require ?token= query param
 * matching VOICE_API_TOKEN (or DASHBOARD_TOKEN as fallback).
 *
 * Personas: loaded from agents/<folder>/CLAUDE.md (single source of truth).
 *
 * Endpoints:
 *   GET  /api/voice/agents            — list available agent personas
 *   POST /api/voice/chat/:agentId     — chat with an agent (Anthropic API)
 *   POST /api/voice/tts/:agentId      — text-to-speech
 *   POST /api/voice/stt               — speech-to-text (multipart form, audio file)
 *   GET  /api/voice/health            — public health check (no auth required)
 */

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { readEnvFile } from '../env.js';
import { DASHBOARD_TOKEN, PROJECT_ROOT } from '../config.js';
import { synthesizeSpeech, transcribeAudio, UPLOADS_DIR } from '../voice.js';
import { logger } from '../logger.js';

// ── Agent personas — CLAUDE.md as single source of truth ─────────────────────

// Agent folder mapping (same convention as dashboard.ts and route.ts)
const agentFolderMap: Record<string, string> = {
  alex:    'main',
  sara:    'comms',
  leo:     'content',
  marco:   'ops',
  nina:    'research',
  maestro: 'maestro',
};

// Static agent metadata (id/name/role)
interface AgentInfo {
  id: string;
  name: string;
  role: string;
}

const AGENT_INFO: Record<string, AgentInfo> = {
  alex:    { id: 'alex',    name: 'Alex',    role: 'Chief of Staff' },
  sara:    { id: 'sara',    name: 'Sara',    role: 'Communications' },
  leo:     { id: 'leo',     name: 'Leo',     role: 'Content Strategy' },
  marco:   { id: 'marco',   name: 'Marco',   role: 'Operations' },
  nina:    { id: 'nina',    name: 'Nina',    role: 'Research' },
  maestro: { id: 'maestro', name: 'Maestro', role: 'CTO' },
};

/**
 * Load the system prompt for an agent from its CLAUDE.md file.
 * Falls back to a minimal English prompt if the file cannot be read.
 */
function loadSystemPrompt(agentId: string): string {
  const folder = agentFolderMap[agentId] ?? agentId;
  const claudeMdPath = path.join(PROJECT_ROOT, 'agents', folder, 'CLAUDE.md');
  try {
    const content = fs.readFileSync(claudeMdPath, 'utf-8');
    logger.debug({ agentId, claudeMdPath }, 'Loaded system prompt from CLAUDE.md');
    return content;
  } catch (err) {
    logger.warn({ agentId, claudeMdPath }, 'CLAUDE.md not found — using fallback prompt');
    const info = AGENT_INFO[agentId];
    const name = info?.name ?? agentId;
    const role = info?.role ?? 'assistant';
    return `You are ${name}, ${role} at Silver Oak. Always respond in the same language as the user.`;
  }
}

// Pre-load all system prompts at startup for fast access
const SYSTEM_PROMPTS: Record<string, string> = {};
for (const agentId of Object.keys(AGENT_INFO)) {
  SYSTEM_PROMPTS[agentId] = loadSystemPrompt(agentId);
}

// ── Anthropic chat helper ─────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function callAnthropic(
  systemPrompt: string,
  messages: ChatMessage[],
  apiKey: string,
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${err.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
  };

  const textBlock = data.content.find((b) => b.type === 'text');
  if (!textBlock) throw new Error('No text content in Anthropic response');
  return textBlock.text;
}

// ── Voice API server ──────────────────────────────────────────────────────────

const VOICE_API_PORT = parseInt(process.env.VOICE_API_PORT ?? '3000', 10);

export function startVoiceApiServer(): void {
  const env = readEnvFile(['ANTHROPIC_API_KEY', 'VOICE_API_PORT', 'VOICE_API_TOKEN']);
  const anthropicKey = env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY ?? '';

  if (!anthropicKey) {
    logger.warn('ANTHROPIC_API_KEY not set — voice chat endpoint will return 503');
  }

  // Auth token: VOICE_API_TOKEN env var, fallback to DASHBOARD_TOKEN
  const VOICE_TOKEN = env.VOICE_API_TOKEN ?? process.env.VOICE_API_TOKEN ?? DASHBOARD_TOKEN;
  if (!VOICE_TOKEN) {
    logger.warn('VOICE_API_TOKEN not set and no DASHBOARD_TOKEN fallback — voice API will be OPEN (no auth)');
  }

  const app = new Hono();

  // CORS — strict allowlist (no wildcard)
  const ALLOWED_ORIGINS = [
    'https://os.silveroak.one',
    'http://localhost:3002',
    'capacitor://localhost', // iOS app future support
  ];

  app.use('*', async (c, next) => {
    const origin = c.req.header('origin') ?? '';
    const isAllowed = ALLOWED_ORIGINS.includes(origin);
    if (isAllowed) {
      c.header('Access-Control-Allow-Origin', origin);
      c.header('Vary', 'Origin');
    }
    c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-test-mode');
    if (c.req.method === 'OPTIONS') return c.body(null, isAllowed ? 204 : 403);
    await next();
  });

  app.onError((err, c) => {
    logger.error({ err: err.message }, 'Voice API error');
    return c.json({ error: 'Internal server error' }, 500);
  });

  // Auth middleware — all routes except /api/voice/health require token
  // Accept: ?token=xxx (query param) OR Authorization: Bearer xxx (header)
  app.use('/api/voice/*', async (c, next) => {
    // Health check is public — no auth required
    if (c.req.path === '/api/voice/health') {
      await next();
      return;
    }

    if (!VOICE_TOKEN) {
      // No token configured → open (warn already logged at startup)
      await next();
      return;
    }

    const queryToken = c.req.query('token');
    const authHeader = c.req.header('authorization');
    const bearerToken = authHeader?.replace(/^Bearer\s+/i, '');
    const token = queryToken ?? bearerToken;

    if (!token || token !== VOICE_TOKEN) {
      logger.warn({ path: c.req.path, method: c.req.method }, 'Voice API unauthorized request');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    await next();
  });

  // GET /api/voice/agents — list available personas (requires auth)
  app.get('/api/voice/agents', (c) => {
    const list = Object.values(AGENT_INFO).map(({ id, name, role }) => ({ id, name, role }));
    return c.json({ agents: list });
  });

  // POST /api/voice/chat/:agentId — chat with an agent
  app.post('/api/voice/chat/:agentId', async (c) => {
    const agentId = c.req.param('agentId');
    if (!AGENT_INFO[agentId]) {
      return c.json({ error: `Unknown agent: ${agentId}` }, 404);
    }
    if (!anthropicKey) {
      return c.json({ error: 'ANTHROPIC_API_KEY not configured' }, 503);
    }

    let body: { message?: string; messages?: ChatMessage[] };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const messages: ChatMessage[] = body.messages ?? [];
    if (body.message) {
      messages.push({ role: 'user', content: body.message });
    }
    if (messages.length === 0) {
      return c.json({ error: 'message or messages required' }, 400);
    }

    const systemPrompt = SYSTEM_PROMPTS[agentId] ?? loadSystemPrompt(agentId);
    const agentInfo = AGENT_INFO[agentId];

    try {
      const reply = await callAnthropic(systemPrompt, messages, anthropicKey);
      return c.json({
        agent: { id: agentInfo.id, name: agentInfo.name },
        reply,
        messages: [...messages, { role: 'assistant', content: reply }],
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ err: msg, agentId }, 'Chat error');
      return c.json({ error: msg }, 502);
    }
  });

  // POST /api/voice/tts/:agentId — text-to-speech
  app.post('/api/voice/tts/:agentId', async (c) => {
    const agentId = c.req.param('agentId');
    if (!AGENT_INFO[agentId]) {
      return c.json({ error: `Unknown agent: ${agentId}` }, 404);
    }

    let body: { text?: string };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const text = body.text?.trim();
    if (!text) {
      return c.json({ error: 'text required' }, 400);
    }

    try {
      const audioPath = await synthesizeSpeech(text);
      const audioBuffer = fs.readFileSync(audioPath);
      // Clean up temp file after reading
      try { fs.unlinkSync(audioPath); } catch { /* ok */ }
      return new Response(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': String(audioBuffer.length),
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ err: msg, agentId }, 'TTS error');
      return c.json({ error: msg }, 502);
    }
  });

  // POST /api/voice/stt — speech-to-text (multipart/form-data, field "audio")
  app.post('/api/voice/stt', async (c) => {
    let formData: FormData;
    try {
      formData = await c.req.formData();
    } catch {
      return c.json({ error: 'Expected multipart/form-data with audio field' }, 400);
    }

    const audioFile = formData.get('audio') as File | null;
    if (!audioFile) {
      return c.json({ error: 'audio field required' }, 400);
    }

    // Write uploaded audio to a temp file
    const ext = audioFile.name?.split('.').pop() ?? 'wav';
    const tmpPath = path.join(os.tmpdir(), `stt-${Date.now()}.${ext}`);
    try {
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      fs.writeFileSync(tmpPath, buffer);
      const transcript = await transcribeAudio(tmpPath);
      return c.json({ transcript });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ err: msg }, 'STT error');
      return c.json({ error: msg }, 502);
    } finally {
      try { fs.unlinkSync(tmpPath); } catch { /* ok */ }
    }
  });

  // Health check — public, no auth
  app.get('/api/voice/health', (c) => c.json({ status: 'ok', port: VOICE_API_PORT }));

  const port = parseInt(env.VOICE_API_PORT ?? String(VOICE_API_PORT), 10);

  try {
    serve({ fetch: app.fetch, port }, () => {
      logger.info({ port }, 'Voice API server running');
    });
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException;
    if (e?.code === 'EADDRINUSE') {
      logger.error({ port }, 'Voice API port already in use');
    } else {
      logger.error({ err: e?.message }, 'Failed to start Voice API server');
    }
  }
}
