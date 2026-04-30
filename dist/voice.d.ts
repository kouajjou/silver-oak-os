export declare const UPLOADS_DIR: string;
/**
 * Download a Telegram file to a local temp path and return the path.
 * Uses the Telegram Bot API file download endpoint.
 */
export declare function downloadTelegramFile(botToken: string, fileId: string, destDir: string): Promise<string>;
/**
 * Transcribe an audio file using the first available provider.
 * Priority: Groq Whisper (cloud) → whisper-cpp (local).
 */
export declare function transcribeAudio(filePath: string): Promise<string>;
/**
 * Convert text to speech using macOS `say` + ffmpeg.
 * Returns an OGG Opus buffer suitable for Telegram voice messages.
 * Only works on macOS with ffmpeg installed.
 */
export declare function synthesizeSpeechLocal(text: string): Promise<Buffer>;
/**
 * Convert text to speech using the first available provider.
 * Priority: ElevenLabs → Gradium AI → Kokoro (local) → macOS say + ffmpeg.
 */
export declare function synthesizeSpeech(text: string): Promise<Buffer>;
/**
 * Check whether voice mode is available (all required env vars are set).
 * TTS is available if any provider is configured or macOS say is available.
 */
export declare function voiceCapabilities(): {
    stt: boolean;
    tts: boolean;
};
//# sourceMappingURL=voice.d.ts.map