/**
 * Voice API Server — Silver Oak OS
 *
 * Standalone Hono server on port VOICE_API_PORT (default 3000).
 * Provides HTTP endpoints for chat, TTS, STT, and agent listing.
 *
 * Endpoints:
 *   GET  /api/voice/agents            — list available agent personas
 *   POST /api/voice/chat/:agentId     — chat with an agent (Gemini API — Mode 2)
 *   POST /api/voice/tts/:agentId      — text-to-speech
 *   POST /api/voice/stt               — speech-to-text (multipart form, audio file)
 *
 * PATCH 2026-04-29 — fix(voiceRouter): replace Anthropic API by Gemini API (Mode 2)
 * Reason: Anthropic API was burning ~$54/day. Gemini 2.0 Flash = ~$0.50/day.
 * callAnthropic archived below. callGemini is the new Mode 2 handler.
 */

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { readEnvFile } from '../env.js';
import { dispatchToTmuxSession } from '../services/cli_tmux_dispatcher.js';
import { synthesizeSpeech, transcribeAudio, UPLOADS_DIR } from '../voice.js';
import { logger } from '../logger.js';

// ── Agent personas ────────────────────────────────────────────────────────────

interface AgentPersona {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
}

const AGENTS: Record<string, AgentPersona> = {
  alex: {
    id: 'alex',
    name: 'Alex',
    role: 'Operations Manager',
    systemPrompt:
      'You are Alex, operations manager at Silver Oak. You are concise, pragmatic, and results-oriented. You help coordinate tasks, track progress, and remove blockers. Always respond in the same language as the user.',
  },
  sara: {
    id: 'sara',
    name: 'Sara',
    role: 'Customer Success',
    systemPrompt:
      'You are Sara, customer success specialist at Silver Oak. You are warm, empathetic, and solution-focused. You help users get maximum value from the platform. Always respond in the same language as the user.',
  },
  leo: {
    id: 'leo',
    name: 'Leo',
    role: 'Lead Engineer',
    systemPrompt:
      'You are Leo, lead engineer at Silver Oak. You are technical, precise, and thorough. You help with architecture decisions, code reviews, and debugging. Always respond in the same language as the user.',
  },
  marco: {
    id: 'marco',
    name: 'Marco',
    role: 'Growth & Marketing',
    systemPrompt:
      'You are Marco, growth and marketing lead at Silver Oak. You are creative, data-driven, and user-centric. You help with go-to-market strategy, content, and growth experiments. Always respond in the same language as the user.',
  },
  nina: {
    id: 'nina',
    name: 'Nina',
    role: 'CFO',
    systemPrompt:
      'You are Nina, CFO at Silver Oak. You are analytical, detail-oriented, and financially rigorous. You help with financial modeling, budgeting, and cost optimization. Always respond in the same language as the user.',
  },
  maestro: {
    id: 'maestro',
    name: 'Maestro',
    role: 'Orchestrator',
    systemPrompt:
      'You are Maestro, the central orchestrator of Silver Oak OS. You coordinate all agents, manage workflows, and ensure tasks are completed efficiently. You have full context of all ongoing operations. Always respond in the same language as the user.',
  },
};

// ── Gemini chat helper (Mode 2 — replaces Anthropic) ─────────────────────────
// Model: gemini-2.0-flash — fast, cheap (~$0.075/1M input tokens vs $3/1M Anthropic)
// PATCH 2026-04-29: Anthropic callAnthropic archived at bottom of file.

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface GeminiContent { role: string; parts: Array<{ text: string }>; }
interface GeminiAPIResponse {
  candidates?: Array<{ content: GeminiContent }>;
  error?: { message: string; code?: number };
}

const GEMINI_MODEL = 'gemini-2.0-flash';

async function callGemini(
  systemPrompt: string,
  messages: ChatMessage[],
  apiKey: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  // Map ChatMessage[] → Gemini contents (user/model roles, no system)
  const contents: GeminiContent[] = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body = {
    contents,
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.7,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as GeminiAPIResponse;

  if (!response.ok || data.error) {
    throw new Error(`Gemini API error ${response.status}: ${data.error?.message ?? 'unknown'}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No text content in Gemini response');
  return text;
}

// ── ARCHIVED — callAnthropic (replaced by callGemini 2026-04-29) ─────────────
// Reason: ~$54/day burned via direct Anthropic API calls. Gemini = ~$0.50/day.
// DO NOT RESTORE without Karim explicit approval.
//
// async function callAnthropic(
//   systemPrompt: string,
//   messages: ChatMessage[],
//   apiKey: string,
// ): Promise<string> {
//   const response = await fetch('https://api.anthropic.com/v1/messages', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       'x-api-key': apiKey,
//       'anthropic-version': '2023-06-01',
//     },
//     body: JSON.stringify({
//       model: 'claude-sonnet-4-6',
//       max_tokens: 1024,
//       system: systemPrompt,
//       messages,
//     }),
//   });
//   if (!response.ok) {
//     const err = await response.text();
//     throw new Error(`Anthropic API error ${response.status}: ${err.slice(0, 300)}`);
//   }
//   const data = (await response.json()) as {
//     content: Array<{ type: string; text: string }>;
//   };
//   const textBlock = data.content.find((b) => b.type === 'text');
//   if (!textBlock) throw new Error('No text content in Anthropic response');
//   return textBlock.text;
// }

// ── Voice API server ──────────────────────────────────────────────────────────

const VOICE_API_PORT = parseInt(process.env.VOICE_API_PORT ?? '3000', 10);

export function startVoiceApiServer(): void {
  const env = readEnvFile(['GOOGLE_API_KEY', 'VOICE_API_PORT', 'USE_VOICE_PRO_MAX']);
  const googleKey = env.GOOGLE_API_KEY ?? process.env.GOOGLE_API_KEY ?? '';
  // Mode 1 — Route via tmux session 'claude-frontend' (Pro Max forfait, $0 marginal)
  // Set USE_VOICE_PRO_MAX=true in .env to activate. Falls back to Gemini API (Mode 2).
  const useVoiceProMax =
    (env.USE_VOICE_PRO_MAX ?? process.env['USE_VOICE_PRO_MAX']) === 'true';

  if (!googleKey) {
    logger.warn('GOOGLE_API_KEY not set — voice chat endpoint (Mode 2) will return 503');
  }

  const app = new Hono();

  // CORS
  app.use('*', async (c, next) => {
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, x-test-mode');
    if (c.req.method === 'OPTIONS') return c.body(null, 204);
    await next();
  });

  app.onError((err, c) => {
    logger.error({ err: err.message }, 'Voice API error');
    return c.json({ error: 'Internal server error' }, 500);
  });

  // GET /api/voice/agents — list available personas
  app.get('/api/voice/agents', (c) => {
    const list = Object.values(AGENTS).map(({ id, name, role }) => ({ id, name, role }));
    return c.json({ agents: list });
  });

  // POST /api/voice/chat/:agentId — chat with an agent
  app.post('/api/voice/chat/:agentId', async (c) => {
    const agentId = c.req.param('agentId');
    const agent = AGENTS[agentId];
    if (!agent) {
      return c.json({ error: `Unknown agent: ${agentId}` }, 404);
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

    try {
      let reply: string;

      if (useVoiceProMax) {
        // ── Mode 1: CLI tmux Pro Max forfait ($0) ───────────────────────────
        // Build a self-contained prompt including system context + last message
        const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
        const userText = lastUserMsg?.content ?? messages[messages.length - 1]?.content ?? '';
        const prompt = [
          `[System: ${agent.systemPrompt}]`,
          '',
          `User: ${userText}`,
          '',
          'Please respond concisely. When done, output exactly: TASK_DONE',
        ].join('\n');

        logger.info({ agentId, session: 'claude-frontend' }, 'voice.chat.mode1_tmux');

        const tmuxResult = await dispatchToTmuxSession('claude-frontend', prompt, {
          timeoutMs: 120_000,   // 2 min max for voice
          pollIntervalMs: 5_000, // poll every 5s (voice needs lower latency than Maestro)
        });

        // Extract reply: everything before TASK_DONE, strip tmux noise
        reply = tmuxResult.content
          .replace(/TASK_DONE(_[a-z0-9-]+)?/gi, '')
          .replace(/\[[0-9;]*[mGKHF]/g, '') // strip ANSI escape codes
          .replace(/^\s*>\s*/gm, '')              // strip tmux prompt artifacts
          .trim();

        if (!reply) {
          throw new Error('Mode 1 tmux dispatch returned empty reply');
        }

        logger.info(
          { agentId, latency: tmuxResult.latency_ms, cost: 0 },
          'voice.chat.mode1_done'
        );
      } else {
        // ── Mode 2: Gemini API (replaces Anthropic — PATCH 2026-04-29) ──────
        // Anthropic was burning ~$54/day. Gemini 2.0 Flash = ~$0.50/day.
        if (!googleKey) {
          return c.json({ error: 'GOOGLE_API_KEY not configured' }, 503);
        }
        logger.info({ agentId, model: GEMINI_MODEL }, 'voice.chat.mode2_gemini');
        reply = await callGemini(agent.systemPrompt, messages, googleKey);
      }

      return c.json({
        agent: { id: agent.id, name: agent.name },
        reply,
        messages: [...messages, { role: 'assistant', content: reply }],
        mode: useVoiceProMax ? 'mode_1_tmux' : 'mode_2_gemini',
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
    if (!AGENTS[agentId]) {
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

  // Health check
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
