import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';

// Mock better-sqlite3 with a real :memory: instance
vi.mock('better-sqlite3', async () => {
  const mod = await vi.importActual<{ default: typeof import('better-sqlite3') }>('better-sqlite3');
  const RealCtor = (mod as unknown as { default: new (path: string) => InstanceType<typeof import('better-sqlite3')> }).default;
  const memInstance = new RealCtor(':memory:');
  return {
    default: vi.fn(() => memInstance),
  };
});

// Mock env / config / logger
vi.mock('../env.js', () => ({
  readEnvFile: vi.fn(() => ({})),
}));
vi.mock('../config.js', () => ({
  TELEGRAM_BOT_TOKEN: '8448099294:AAGhf4H4rPzW8N68_iJE772CeWAvxgcECVk',
  ALLOWED_CHAT_ID: '5566541774',
}));
vi.mock('../logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { validateAllTokens, getTokenStatuses } from './token-validator.js';
import { readEnvFile } from '../env.js';

const mockedReadEnv = vi.mocked(readEnvFile);

// Mock fetch globally
const mockedFetch = vi.fn();
beforeEach(() => {
  mockedReadEnv.mockReset();
  mockedFetch.mockReset();
  global.fetch = mockedFetch as unknown as typeof fetch;

  // Wipe the SQLite token_status table between tests
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockedCtor = vi.mocked(Database) as any;
  const memDb = mockedCtor.mock.results[0]?.value as InstanceType<typeof Database> | undefined;
  if (memDb) {
    try { memDb.exec('DELETE FROM token_status'); } catch { /* table may not exist on first run */ }
  }
});

afterEach(() => {
  vi.useRealTimers();
});

// Helper: build a Response-like object
function fakeResponse(ok: boolean, status = ok ? 200 : 401): Response {
  return { ok, status } as Response;
}

describe('validateAllTokens', () => {
  it('returns empty array when no tokens are configured', async () => {
    mockedReadEnv.mockReturnValue({});

    const results = await validateAllTokens();
    expect(results).toEqual([]);
  });

  it('returns valid: true for all tokens when APIs respond OK', async () => {
    mockedReadEnv.mockReturnValue({
      TELEGRAM_BOT_TOKEN: 'fake-telegram-token-1234567890',
      GOOGLE_API_KEY: 'fake-google-api-key-1234567890',
    });
    mockedFetch.mockResolvedValue(fakeResponse(true));

    const results = await validateAllTokens();
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.valid)).toBe(true);
  });

  it('marks Telegram bot token as invalid when API returns 401', async () => {
    mockedReadEnv.mockReturnValue({
      TELEGRAM_BOT_TOKEN: 'invalid-telegram-token-123456',
      GOOGLE_API_KEY: 'fake-google-api-key-1234567890',
    });
    // Telegram getMe -> 401, then alert send -> 200, Gemini -> 200
    mockedFetch.mockImplementation(async (url: string) => {
      if (url.includes('telegram.org/bot') && url.includes('getMe')) return fakeResponse(false, 401);
      if (url.includes('telegram.org/bot') && url.includes('sendMessage')) return fakeResponse(true);
      if (url.includes('googleapis.com')) return fakeResponse(true);
      return fakeResponse(false, 404);
    });

    const results = await validateAllTokens();
    const tg = results.find((r) => r.name === 'TELEGRAM_BOT_TOKEN');
    const goog = results.find((r) => r.name === 'GOOGLE_API_KEY');

    expect(tg?.valid).toBe(false);
    expect(goog?.valid).toBe(true);
  });

  it('returns valid: false (no throw) on fetch network error / timeout', async () => {
    mockedReadEnv.mockReturnValue({
      TELEGRAM_BOT_TOKEN: 'some-telegram-token-1234567890',
    });
    mockedFetch.mockRejectedValue(new Error('network down'));

    const results = await validateAllTokens();
    expect(results).toHaveLength(1);
    expect(results[0].valid).toBe(false);
    expect(results[0].error).toContain('network down');
  });

  it('rejects tokens shorter than 20 chars without HTTP call', async () => {
    mockedReadEnv.mockReturnValue({
      TELEGRAM_BOT_TOKEN: 'short',
    });

    const results = await validateAllTokens();
    expect(results[0].valid).toBe(false);
    expect(results[0].error).toContain('too short');
    // No HTTP call made for a too-short token
    const httpCalls = mockedFetch.mock.calls.filter((c) => String(c[0]).includes('telegram.org/bot'));
    // Can be 0 (no call for short token) or 1 (alert sent for critical invalid)
    const getMeCalls = httpCalls.filter((c) => String(c[0]).includes('getMe'));
    expect(getMeCalls.length).toBe(0);
  });

  it('triggers Telegram alert when CRITICAL token is invalid', async () => {
    mockedReadEnv.mockReturnValue({
      TELEGRAM_BOT_TOKEN: 'invalid-telegram-token-1234567890',
    });
    mockedFetch.mockImplementation(async (url: string) => {
      if (url.includes('getMe')) return fakeResponse(false, 401);
      if (url.includes('sendMessage')) return fakeResponse(true);
      return fakeResponse(true);
    });

    await validateAllTokens();
    // wait microtasks for fire-and-forget alert
    await Promise.resolve();
    await Promise.resolve();

    const alertCalls = mockedFetch.mock.calls.filter((c) => String(c[0]).includes('sendMessage'));
    expect(alertCalls.length).toBeGreaterThanOrEqual(1);
    const body = JSON.parse(alertCalls[0][1].body);
    expect(body.text).toContain('TELEGRAM_BOT_TOKEN');
  });

  it('does NOT trigger Telegram alert when only NON-CRITICAL tokens are invalid', async () => {
    mockedReadEnv.mockReturnValue({
      // OPENAI is not in CRITICAL_TOKENS
      OPENAI_API_KEY: 'invalid-openai-key-but-long-enough-to-pass-length-check',
    });
    mockedFetch.mockImplementation(async (url: string) => {
      if (url.includes('openai.com')) return fakeResponse(false, 401);
      if (url.includes('sendMessage')) return fakeResponse(true);
      return fakeResponse(true);
    });

    await validateAllTokens();
    await Promise.resolve();
    await Promise.resolve();

    const alertCalls = mockedFetch.mock.calls.filter((c) => String(c[0]).includes('sendMessage'));
    expect(alertCalls.length).toBe(0);
  });

  it('persists results in SQLite (visible via getTokenStatuses)', async () => {
    mockedReadEnv.mockReturnValue({
      GOOGLE_API_KEY: 'fake-google-key-1234567890',
    });
    mockedFetch.mockResolvedValue(fakeResponse(true));

    await validateAllTokens();

    const statuses = getTokenStatuses();
    const goog = statuses.find((s) => s.name === 'GOOGLE_API_KEY');
    expect(goog).toBeDefined();
    expect(goog!.valid).toBe(true);
  });

  it('handles xAI key under XAI_API_KEY name when present', async () => {
    mockedReadEnv.mockReturnValue({
      XAI_API_KEY: 'xai-fake-key-1234567890123456',
    });
    mockedFetch.mockResolvedValue(fakeResponse(true));

    const results = await validateAllTokens();
    expect(results.find((r) => r.name === 'XAI_API_KEY')?.valid).toBe(true);
  });

  it('handles xAI key under GROK_API_KEY name when XAI_API_KEY is absent', async () => {
    mockedReadEnv.mockReturnValue({
      GROK_API_KEY: 'grok-fake-key-1234567890123456',
    });
    mockedFetch.mockResolvedValue(fakeResponse(true));

    const results = await validateAllTokens();
    expect(results.find((r) => r.name === 'GROK_API_KEY')?.valid).toBe(true);
  });
});

describe('getTokenStatuses', () => {
  it('returns an array (possibly empty)', () => {
    const r = getTokenStatuses();
    expect(Array.isArray(r)).toBe(true);
  });

  it('converts SQLite integer valid (0/1) to boolean', async () => {
    mockedReadEnv.mockReturnValue({
      GOOGLE_API_KEY: 'fake-google-key-1234567890',
    });
    mockedFetch.mockResolvedValue(fakeResponse(true));

    await validateAllTokens();

    const statuses = getTokenStatuses();
    for (const s of statuses) {
      expect(typeof s.valid).toBe('boolean');
    }
  });
});
