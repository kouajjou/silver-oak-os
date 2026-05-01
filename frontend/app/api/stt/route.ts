import { NextRequest, NextResponse } from 'next/server';

/**
 * Speech-to-Text proxy route.
 *
 * Receives multipart/form-data with audio field, forwards to backend
 * /api/voice/stt, returns transcript.
 *
 * PhD fix 2026-05-01 — Karim asked for real voice input on iPhone.
 * Uses Gemini Audio (free with GOOGLE_API_KEY) as primary STT provider.
 */
export async function POST(req: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_VOICE_URL ?? 'http://localhost:3000';
    const backendToken = process.env.VOICE_API_TOKEN;

    if (!backendToken) {
      return NextResponse.json({ error: 'VOICE_API_TOKEN not configured' }, { status: 500 });
    }

    // Forward the multipart body as-is
    const formData = await req.formData();
    const audioFile = formData.get('audio');
    if (!audioFile) {
      return NextResponse.json({ error: 'audio field required' }, { status: 400 });
    }

    // Re-create FormData for backend (Next.js formData passes through fine)
    const backendForm = new FormData();
    backendForm.append('audio', audioFile);

    const backendRes = await fetch(`${backendUrl}/api/voice/stt`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${backendToken}`,
      },
      body: backendForm,
      signal: AbortSignal.timeout(60_000),
    });

    if (!backendRes.ok) {
      const errText = await backendRes.text();
      console.error('[stt] backend error:', backendRes.status, errText.slice(0, 200));
      return NextResponse.json(
        { error: `Backend STT failed: ${backendRes.status}` },
        { status: backendRes.status }
      );
    }

    const data = await backendRes.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[stt] proxy error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
