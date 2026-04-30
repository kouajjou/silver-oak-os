/**
 * Voice API Server — Silver Oak OS
 *
 * Standalone Hono server on port VOICE_API_PORT (default 3000).
 * Provides HTTP endpoints for chat, TTS, STT, and agent listing.
 *
 * Endpoints:
 *   GET  /api/voice/agents            — list available agent personas
 *   POST /api/voice/chat/:agentId     — chat with an agent (Gemini Flash / tmux Pro Max)
 *   POST /api/voice/tts/:agentId      — text-to-speech
 *   POST /api/voice/stt               — speech-to-text (multipart form, audio file)
 */
export declare function startVoiceApiServer(): void;
//# sourceMappingURL=voiceRouter.d.ts.map