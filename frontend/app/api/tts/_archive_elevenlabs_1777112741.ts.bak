import { NextRequest, NextResponse } from 'next/server';

const VOICES: Record<string, { voice_id: string; name: string; style: string }> = {
  alex: { voice_id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', style: 'deep, calm, confident' },
  sara: { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', style: 'warm, clear' },
  leo: { voice_id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', style: 'dynamic, young' },
  marco: { voice_id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', style: 'calm, methodical' },
  nina: { voice_id: 'hpp4J3VqNfWAUOO0d1Us', name: 'Bella', style: 'precise, articulate' },
  maestro: { voice_id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', style: 'technical, calm' },
};

const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { text?: string; agent_id?: string; voice_id?: string };
    const { text } = body;
    // Accept either agent_id (preferred) or voice_id directly
    const agentKey = body.agent_id?.toLowerCase() ?? '';
    const voice = VOICES[agentKey] ?? { voice_id: body.voice_id ?? '21m00Tcm4TlvDq8ikWAM', name: 'Default', style: '' };
    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.voice_id}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVEN_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `ElevenLabs API error: ${err}` }, { status: 502 });
    }

    const audio = await res.arrayBuffer();
    return new NextResponse(audio, {
      status: 200,
      headers: { 'Content-Type': 'audio/mpeg' },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
