import { NextRequest, NextResponse } from 'next/server';

/**
 * Maestro stats proxy.
 * Forwards GET /api/maestro/stats?days=N to the backend dashboard endpoint.
 * Token is appended server-side so the frontend page never sees it.
 */
export async function GET(req: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_CHAT_URL ?? 'http://localhost:3141';
    const backendToken = process.env.BACKEND_CHAT_TOKEN;
    if (!backendToken) {
      return NextResponse.json({ error: 'BACKEND_CHAT_TOKEN not configured' }, { status: 500 });
    }

    const days = req.nextUrl.searchParams.get('days') ?? '7';
    const url = `${backendUrl}/api/maestro/stats?days=${encodeURIComponent(days)}&token=${encodeURIComponent(backendToken)}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      return NextResponse.json({ error: `Backend stats failed: ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
