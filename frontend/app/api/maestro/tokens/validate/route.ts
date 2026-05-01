import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const backendUrl = process.env.BACKEND_CHAT_URL ?? 'http://localhost:3141';
    const backendToken = process.env.BACKEND_CHAT_TOKEN;
    if (!backendToken) {
      return NextResponse.json({ error: 'BACKEND_CHAT_TOKEN not configured' }, { status: 500 });
    }

    const url = `${backendUrl}/api/maestro/tokens/validate?token=${encodeURIComponent(backendToken)}`;
    const res = await fetch(url, {
      method: 'POST',
      // 90s — re-validation calls multiple external APIs
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Backend validate failed: ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
