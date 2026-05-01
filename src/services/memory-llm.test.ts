import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../adapters/llm/index.js', () => ({
  callLLM: vi.fn(),
  getProvidersStatus: vi.fn(),
}));

vi.mock('../logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { callMemoryLLM, MemoryLLMError } from './memory-llm.js';
import { callLLM, getProvidersStatus } from '../adapters/llm/index.js';

const mockedCallLLM = vi.mocked(callLLM);
const mockedStatus = vi.mocked(getProvidersStatus);

function fakeRes(opts: { provider: 'mistral' | 'google'; model: string; content: string; cost?: number; latency?: number }) {
  return {
    provider: opts.provider,
    model: opts.model,
    content: opts.content,
    tokens_in: 50,
    tokens_out: 30,
    cost_usd: opts.cost ?? 0.0001,
    latency_ms: opts.latency ?? 800,
  };
}

beforeEach(() => {
  mockedCallLLM.mockReset();
  mockedStatus.mockReset();
  // Default: Mistral key present and available
  process.env['MISTRAL_API_KEY'] = 'fake-mistral-key-1234567890';
  mockedStatus.mockReturnValue([
    { provider: 'mistral', available: true },
    { provider: 'google', available: true },
  ]);
});

describe('callMemoryLLM — primary path (Mistral)', () => {
  it('uses Mistral with strict JSON system prompt when available', async () => {
    mockedCallLLM.mockResolvedValueOnce(fakeRes({ provider: 'mistral', model: 'mistral-small-latest', content: '{"ok":true}' }));

    const res = await callMemoryLLM('Extract memory from this conversation');

    expect(res).toBe('{"ok":true}');
    expect(mockedCallLLM).toHaveBeenCalledTimes(1);
    const req = mockedCallLLM.mock.calls[0][0];
    expect(req.provider).toBe('mistral');
    expect(req.model).toBe('mistral-small-latest');
    expect(req.agent_id).toBe('memory');
    expect(req.messages[0].role).toBe('system');
    expect(req.messages[0].content).toContain('JSON valide');
  });

  it('appends context to the user prompt when provided', async () => {
    mockedCallLLM.mockResolvedValueOnce(fakeRes({ provider: 'mistral', model: 'mistral-small-latest', content: '[]' }));

    await callMemoryLLM('Consolidate these:', 'memory_id=42');

    const req = mockedCallLLM.mock.calls[0][0];
    expect(req.messages[1].content).toBe('Consolidate these:memory_id=42');
  });

  it('uses temperature 0.1 and max_tokens 1000 (deterministic, JSON-friendly)', async () => {
    mockedCallLLM.mockResolvedValueOnce(fakeRes({ provider: 'mistral', model: 'mistral-small-latest', content: '{}' }));

    await callMemoryLLM('test');

    const req = mockedCallLLM.mock.calls[0][0];
    expect(req.temperature).toBe(0.1);
    expect(req.max_tokens).toBe(1000);
  });
});

describe('callMemoryLLM — fallback path (Gemini)', () => {
  it('falls back to Gemini Flash Lite when MISTRAL_API_KEY is missing', async () => {
    delete process.env['MISTRAL_API_KEY'];
    mockedStatus.mockReturnValue([
      { provider: 'mistral', available: false },
      { provider: 'google', available: true },
    ]);
    mockedCallLLM.mockResolvedValueOnce(fakeRes({ provider: 'google', model: 'gemini-2.5-flash-lite', content: '{"fallback":true}' }));

    const res = await callMemoryLLM('test');

    expect(res).toBe('{"fallback":true}');
    expect(mockedCallLLM).toHaveBeenCalledTimes(1);
    const req = mockedCallLLM.mock.calls[0][0];
    expect(req.provider).toBe('google');
    expect(req.model).toBe('gemini-2.5-flash-lite');
  });

  it('falls back to Gemini when Mistral throws', async () => {
    mockedCallLLM
      .mockRejectedValueOnce(new Error('Mistral 503'))
      .mockResolvedValueOnce(fakeRes({ provider: 'google', model: 'gemini-2.5-flash-lite', content: '{"recovered":true}' }));

    const res = await callMemoryLLM('test');

    expect(res).toBe('{"recovered":true}');
    expect(mockedCallLLM).toHaveBeenCalledTimes(2);
    expect(mockedCallLLM.mock.calls[0][0].provider).toBe('mistral');
    expect(mockedCallLLM.mock.calls[1][0].provider).toBe('google');
  });

  it('falls back to Gemini when Mistral returns empty content', async () => {
    mockedCallLLM
      .mockResolvedValueOnce(fakeRes({ provider: 'mistral', model: 'mistral-small-latest', content: '   ' }))
      .mockResolvedValueOnce(fakeRes({ provider: 'google', model: 'gemini-2.5-flash-lite', content: '{"saved":true}' }));

    const res = await callMemoryLLM('test');

    expect(res).toBe('{"saved":true}');
    expect(mockedCallLLM).toHaveBeenCalledTimes(2);
  });

  it('falls back to Gemini when getProvidersStatus reports mistral unavailable', async () => {
    mockedStatus.mockReturnValue([
      { provider: 'mistral', available: false },
      { provider: 'google', available: true },
    ]);
    mockedCallLLM.mockResolvedValueOnce(fakeRes({ provider: 'google', model: 'gemini-2.5-flash-lite', content: '{}' }));

    await callMemoryLLM('test');

    expect(mockedCallLLM).toHaveBeenCalledTimes(1);
    expect(mockedCallLLM.mock.calls[0][0].provider).toBe('google');
  });
});

describe('callMemoryLLM — total failure', () => {
  it('throws MemoryLLMError when both Mistral and Gemini fail', async () => {
    mockedCallLLM.mockRejectedValue(new Error('outage'));

    await expect(callMemoryLLM('test')).rejects.toBeInstanceOf(MemoryLLMError);
  });

  it('throws MemoryLLMError when Mistral succeeds but Gemini fallback is also empty', async () => {
    // Mistral empty -> Gemini also empty
    mockedCallLLM
      .mockResolvedValueOnce(fakeRes({ provider: 'mistral', model: 'mistral-small-latest', content: '' }))
      .mockResolvedValueOnce(fakeRes({ provider: 'google', model: 'gemini-2.5-flash-lite', content: '' }));

    await expect(callMemoryLLM('test')).rejects.toBeInstanceOf(MemoryLLMError);
  });
});

describe('MemoryLLMError', () => {
  it('is an Error subclass with name MemoryLLMError', () => {
    const e = new MemoryLLMError('boom');
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('MemoryLLMError');
    expect(e.message).toBe('boom');
  });

  it('preserves cause when provided', () => {
    const cause = new Error('inner');
    const e = new MemoryLLMError('wrap', cause);
    expect(e.cause).toBe(cause);
  });
});
