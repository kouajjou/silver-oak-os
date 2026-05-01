import { NextRequest, NextResponse } from 'next/server';

// Voice mappings — sourced from vision.yml v1.2
const VOICE_MAP: Record<string, { gemini: string; openai: string }> = {
  alex:    { gemini: 'Charon', openai: 'onyx' },
  sara:    { gemini: 'Aoede',  openai: 'nova' },
  leo:     { gemini: 'Puck',   openai: 'fable' },
  marco:   { gemini: 'Orus',   openai: 'echo' },
  nina:    { gemini: 'Kore',   openai: 'shimmer' },
  maestro: { gemini: 'Fenrir', openai: 'alloy' },
};

const MAX_TEXT_LEN = 500;

interface TtsRequest {
  text?: string;
  agentId?: string;      // camelCase — preferred
  agent_id?: string;     // snake_case — deprecated, use agentId (until 2026-05-25)
  voice_id?: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: { mimeType: string; data: string };
        text?: string;
      }>;
    };
  }>;
  error?: { message: string; code: number };
}

interface OpenAIErrorResponse {
  error?: { message: string };
}

/**
 * PhD fix 2026-05-01: Gemini TTS returns RAW PCM (16-bit, 24kHz, mono),
 * not MP3 as the URL suggests. Wrap with WAV header so browsers can play it.
 *
 * WAV format: 44-byte header + raw PCM data.
 */
function pcmToWav(pcmData: Buffer): Buffer {
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = pcmData.length;
  const fileSize = 36 + dataSize;

  const header = Buffer.alloc(44);
  // "RIFF"
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(fileSize, 4);
  header.write('WAVE', 8, 'ascii');
  // "fmt " subchunk
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);  // subchunk size
  header.writeUInt16LE(1, 20);   // PCM format
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  // "data" subchunk
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}

async function ttsGemini(text: string, voiceName: string): Promise<Buffer | null> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        }),
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('[tts] Gemini error', res.status, err.substring(0, 200));
      return null;
    }

    const data = await res.json() as GeminiResponse;
    const inlineData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inlineData?.data) {
      console.error('[tts] Gemini no inlineData in response');
      return null;
    }

    // PhD fix 2026-05-01: Gemini returns raw PCM, wrap in WAV so browsers can play it
    const pcmBuffer = Buffer.from(inlineData.data, 'base64');
    return pcmToWav(pcmBuffer);
  } catch (err) {
    console.error('[tts] Gemini fetch failed:', err);
    return null;
  }
}

async function ttsOpenAI(text: string, voice: string): Promise<Buffer | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice,
        input: text,
        response_format: 'mp3',
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const err = await res.text() as string;
      let detail = err;
      try { detail = (JSON.parse(err) as OpenAIErrorResponse).error?.message ?? err; } catch {}
      console.error('[tts] OpenAI error', res.status, detail);
      return null;
    }

    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch (err) {
    console.error('[tts] OpenAI fetch failed:', err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const startMs = Date.now();

  try {
    const body = await req.json() as TtsRequest;
    const rawText = body.text?.trim() ?? '';

    if (!rawText) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }
    if (rawText.length > MAX_TEXT_LEN) {
      return NextResponse.json(
        { error: `text too long (max ${MAX_TEXT_LEN} chars)` },
        { status: 400 }
      );
    }

    // Backward compat: accept agent_id (deprecated) OR agentId (preferred)
    const usedDeprecatedParam = !!(body.agent_id && !body.agentId);
    const rawAgentId = body.agentId ?? body.agent_id;
    if (usedDeprecatedParam) {
      console.warn('[tts] DEPRECATED param agent_id used — migrate to agentId before 2026-05-25');
    }

    const agentKey = (rawAgentId ?? '').toLowerCase();
    const voices = VOICE_MAP[agentKey] ?? VOICE_MAP.alex;

    // Build deprecation headers if needed
    const deprecationHeaders: Record<string, string> = usedDeprecatedParam
      ? { 'X-Deprecated-Param-Format': 'agent_id is deprecated; use agentId (until 2026-05-25)' }
      : {};

    // Try Gemini TTS first
    const geminiAudio = await ttsGemini(rawText, voices.gemini);
    if (geminiAudio && geminiAudio.length > 1000) {
      console.log(`[tts] gemini OK agent=${agentKey} voice=${voices.gemini} size=${geminiAudio.length} ms=${Date.now() - startMs}`);
      return new NextResponse(new Uint8Array(geminiAudio), {
        status: 200,
        headers: {
          'Content-Type': 'audio/wav',
          'X-TTS-Provider': 'gemini',
          'X-TTS-Voice': voices.gemini,
          'Cache-Control': 'public, max-age=86400',
          ...deprecationHeaders,
        },
      });
    }

    // Fallback: OpenAI TTS-1
    const openaiAudio = await ttsOpenAI(rawText, voices.openai);
    if (openaiAudio && openaiAudio.length > 1000) {
      console.log(`[tts] openai fallback OK agent=${agentKey} voice=${voices.openai} size=${openaiAudio.length} ms=${Date.now() - startMs}`);
      return new NextResponse(new Uint8Array(openaiAudio), {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'X-TTS-Provider': 'openai',
          'X-TTS-Voice': voices.openai,
          'Cache-Control': 'public, max-age=86400',
          ...deprecationHeaders,
        },
      });
    }

    // Both failed
    console.error('[tts] Both Gemini and OpenAI failed');
    return NextResponse.json(
      {
        error: 'TTS unavailable',
        details: { gemini: !geminiAudio ? 'failed' : 'empty', openai: !openaiAudio ? 'failed' : 'empty' },
      },
      { status: 503, headers: deprecationHeaders }
    );
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
