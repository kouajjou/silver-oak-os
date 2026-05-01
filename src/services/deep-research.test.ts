import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks BEFORE module under test imports
vi.mock('../adapters/llm/index.js', () => ({
  callLLM: vi.fn(),
}));

vi.mock('../logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { deepResearch, DeepResearchError } from './deep-research.js';
import { callLLM } from '../adapters/llm/index.js';

const mockedCallLLM = vi.mocked(callLLM);

// Helper to build a fake LLMResponse
function fakeRes(opts: {
  provider: string;
  model: string;
  content: string;
  cost?: number;
  latency?: number;
}) {
  return {
    provider: opts.provider as 'xai' | 'google',
    model: opts.model,
    content: opts.content,
    tokens_in: 100,
    tokens_out: 200,
    cost_usd: opts.cost ?? 0.005,
    latency_ms: opts.latency ?? 1200,
  };
}

describe('deepResearch', () => {
  beforeEach(() => {
    mockedCallLLM.mockReset();
  });

  it('throws DeepResearchError on empty query', async () => {
    await expect(deepResearch('')).rejects.toBeInstanceOf(DeepResearchError);
    await expect(deepResearch('   ')).rejects.toBeInstanceOf(DeepResearchError);
    expect(mockedCallLLM).not.toHaveBeenCalled();
  });

  it('returns 2 sources when both Grok and Gemini succeed', async () => {
    mockedCallLLM.mockImplementation(async (req) => {
      if (req.provider === 'xai') return fakeRes({ provider: 'xai', model: 'grok-4-fast-reasoning', content: 'Grok answer about X', cost: 0.005, latency: 1500 });
      if (req.model === 'gemini-2.5-pro') return fakeRes({ provider: 'google', model: 'gemini-2.5-pro', content: 'Gemini answer about X', cost: 0.008, latency: 2200 });
      return fakeRes({ provider: 'google', model: 'gemini-2.5-flash', content: 'Synthesis result', cost: 0.001, latency: 800 });
    });

    const r = await deepResearch('What is X');

    expect(r.sources).toHaveLength(2);
    expect(r.sources[0].provider).toBe('grok');
    expect(r.sources[1].provider).toBe('gemini');
    expect(r.synthesis).toBe('Synthesis result');
    // Total cost = 0.005 (grok) + 0.008 (gemini) + 0.001 (synth) = 0.014
    expect(r.total_cost_usd).toBeCloseTo(0.014, 5);
    expect(r.total_latency_ms).toBeGreaterThanOrEqual(0);
    expect(r.query).toBe('What is X');
    expect(r.ts).toBeGreaterThan(0);
  });

  it('continues with Gemini only when Grok fails (both primary and fallback)', async () => {
    // Use mockImplementation so order doesn't matter (Promise.all parallelizes)
    mockedCallLLM.mockImplementation(async (req) => {
      if (req.provider === 'xai') throw new Error('grok down');
      if (req.model === 'gemini-2.5-pro') return fakeRes({ provider: 'google', model: 'gemini-2.5-pro', content: 'Gemini solo', cost: 0.008 });
      // synthesis (gemini-2.5-flash)
      return fakeRes({ provider: 'google', model: 'gemini-2.5-flash', content: 'Synth from 1 source', cost: 0.001 });
    });

    const r = await deepResearch('test query');

    expect(r.sources).toHaveLength(1);
    expect(r.sources[0].provider).toBe('gemini');
    expect(r.synthesis).toBe('Synth from 1 source');
    expect(r.total_cost_usd).toBeCloseTo(0.009, 5);
  });

  it('continues with Grok only when Gemini fails (both primary and fallback)', async () => {
    // Track synthesis call separately to distinguish from gemini source attempts
    let synthCallSeen = false;
    mockedCallLLM.mockImplementation(async (req) => {
      if (req.provider === 'xai') return fakeRes({ provider: 'xai', model: 'grok-4-fast-reasoning', content: 'Grok solo', cost: 0.005 });
      // For google: first 2 calls (pro then flash fallback) come from research phase, fail both
      // The 3rd google call is synthesis (Gemini Flash)
      if (req.provider === 'google' && !synthCallSeen) {
        // Distinguish synthesis by checking if there's a system prompt about synthesis
        const isSynthesis = req.messages.some(m => m.role === 'system' && m.content.includes('synthèse'));
        if (isSynthesis) {
          synthCallSeen = true;
          return fakeRes({ provider: 'google', model: 'gemini-2.5-flash', content: 'Synth from 1 source', cost: 0.001 });
        }
        throw new Error('gemini down');
      }
      if (req.provider === 'google') {
        return fakeRes({ provider: 'google', model: 'gemini-2.5-flash', content: 'Synth from 1 source', cost: 0.001 });
      }
      throw new Error('unexpected call');
    });

    const r = await deepResearch('test query');

    expect(r.sources).toHaveLength(1);
    expect(r.sources[0].provider).toBe('grok');
    expect(r.synthesis).toBe('Synth from 1 source');
  });

  it('falls back to secondary model when primary fails', async () => {
    mockedCallLLM.mockImplementation(async (req) => {
      if (req.provider === 'xai' && req.model === 'grok-4-fast-reasoning') throw new Error('primary fail');
      if (req.provider === 'xai' && req.model === 'grok-3-fast') return fakeRes({ provider: 'xai', model: 'grok-3-fast', content: 'Grok via fallback' });
      if (req.provider === 'google' && req.model === 'gemini-2.5-pro') return fakeRes({ provider: 'google', model: 'gemini-2.5-pro', content: 'Gemini ok' });
      // Synthesis (gemini-2.5-flash)
      return fakeRes({ provider: 'google', model: 'gemini-2.5-flash', content: 'Synth' });
    });

    const r = await deepResearch('test');
    expect(r.sources).toHaveLength(2);
    expect(r.sources[0].model).toBe('grok-3-fast');
  });

  it('throws DeepResearchError when both Grok and Gemini fail entirely', async () => {
    // All 4 calls fail (Grok primary, Grok fallback, Gemini primary, Gemini fallback)
    mockedCallLLM.mockRejectedValue(new Error('total outage'));

    await expect(deepResearch('test')).rejects.toBeInstanceOf(DeepResearchError);
  });

  it('returns raw sources synthesis if consolidation step fails', async () => {
    mockedCallLLM.mockImplementation(async (req) => {
      if (req.provider === 'xai') return fakeRes({ provider: 'xai', model: 'grok-4-fast-reasoning', content: 'Grok content' });
      if (req.provider === 'google' && req.model === 'gemini-2.5-pro') return fakeRes({ provider: 'google', model: 'gemini-2.5-pro', content: 'Gemini content' });
      // synthesis (gemini-2.5-flash) fails
      throw new Error('synth down');
    });

    const r = await deepResearch('test');

    expect(r.sources).toHaveLength(2);
    expect(r.synthesis).toContain('Consolidation Gemini Flash a échoué');
    expect(r.synthesis).toContain('Grok content');
    expect(r.synthesis).toContain('Gemini content');
  });

  it('total_cost_usd equals sum of source costs plus synthesis cost', async () => {
    mockedCallLLM.mockImplementation(async (req) => {
      if (req.provider === 'xai') return fakeRes({ provider: 'xai', model: 'grok-4-fast-reasoning', content: 'a', cost: 0.010 });
      if (req.provider === 'google' && req.model === 'gemini-2.5-pro') return fakeRes({ provider: 'google', model: 'gemini-2.5-pro', content: 'b', cost: 0.020 });
      return fakeRes({ provider: 'google', model: 'gemini-2.5-flash', content: 'synth', cost: 0.003 });
    });

    const r = await deepResearch('test');

    expect(r.total_cost_usd).toBeCloseTo(0.033, 5);
  });

  it('uses agent_id "research" for all callLLM invocations', async () => {
    mockedCallLLM.mockImplementation(async (req) => {
      if (req.provider === 'xai') return fakeRes({ provider: 'xai', model: 'grok-4-fast-reasoning', content: 'a' });
      if (req.model === 'gemini-2.5-pro') return fakeRes({ provider: 'google', model: 'gemini-2.5-pro', content: 'b' });
      return fakeRes({ provider: 'google', model: 'gemini-2.5-flash', content: 'synth' });
    });

    await deepResearch('test');

    for (const call of mockedCallLLM.mock.calls) {
      expect(call[0].agent_id).toBe('research');
    }
  });
});

describe('DeepResearchError', () => {
  it('is an Error subclass with name DeepResearchError', () => {
    const e = new DeepResearchError('boom');
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('DeepResearchError');
    expect(e.message).toBe('boom');
  });

  it('preserves cause when provided', () => {
    const cause = new Error('underlying');
    const e = new DeepResearchError('wrap', cause);
    expect(e.cause).toBe(cause);
  });
});
