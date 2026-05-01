import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = process.env.BACKEND_CHAT_URL ?? 'http://localhost:3141';
    const backendToken = process.env.BACKEND_CHAT_TOKEN;
    if (!backendToken) {
      return NextResponse.json({ error: 'BACKEND_CHAT_TOKEN not configured' }, { status: 500 });
    }

    const url = `${backendUrl}/api/maestro/tokens?token=${encodeURIComponent(backendToken)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      return NextResponse.json({ error: `Backend tokens failed: ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
