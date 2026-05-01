import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./gemini.js', () => ({
  parseJsonResponse: vi.fn(),
}));

vi.mock('./services/memory-llm.js', () => ({
  callMemoryLLM: vi.fn(),
}));

vi.mock('./db.js', () => ({
  saveStructuredMemoryAtomic: vi.fn(() => 1),
  getMemoriesWithEmbeddings: vi.fn(() => []),
}));

vi.mock('./embeddings.js', () => ({
  embedText: vi.fn(() => Promise.resolve([0.1, 0.2, 0.3])),
  cosineSimilarity: vi.fn(() => 0),
}));

vi.mock('./logger.js', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { ingestConversationTurn } from './memory-ingest.js';
import { parseJsonResponse } from './gemini.js';
import { callMemoryLLM } from './services/memory-llm.js';
import { saveStructuredMemoryAtomic } from './db.js';

const mockCallMemoryLLM = vi.mocked(callMemoryLLM);
const mockParseJson = vi.mocked(parseJsonResponse);
const mockSave = vi.mocked(saveStructuredMemoryAtomic);

describe('ingestConversationTurn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Hard filters (skip before hitting Gemini) ────────────────────

  it('skips messages <= 15 characters', async () => {
    const result = await ingestConversationTurn('chat1', 'short msg', 'ok');
    expect(result).toBe(false);
    expect(mockCallMemoryLLM).not.toHaveBeenCalled();
  });

  it('skips messages exactly 15 characters', async () => {
    const result = await ingestConversationTurn('chat1', '123456789012345', 'ok');
    expect(result).toBe(false);
    expect(mockCallMemoryLLM).not.toHaveBeenCalled();
  });

  it('processes messages of 50+ characters', async () => {
    mockCallMemoryLLM.mockResolvedValue('{}');
    mockParseJson.mockReturnValue({ skip: true });
    // 60-char message — passes the new <50 chars guard
    const result = await ingestConversationTurn('chat1', 'this is a long enough message of at least fifty characters', 'ok');
    // Should have called the LLM even though it was skipped by LLM
    expect(mockCallMemoryLLM).toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('skips messages starting with /', async () => {
    const result = await ingestConversationTurn('chat1', '/chatid some long command text here', 'Your ID is 12345');
    expect(result).toBe(false);
    expect(mockCallMemoryLLM).not.toHaveBeenCalled();
  });

  // ── Gemini decides to skip ────────────────────────────────────────

  it('returns false when Gemini says skip', async () => {
    mockCallMemoryLLM.mockResolvedValue('{"skip": true}');
    mockParseJson.mockReturnValue({ skip: true });
    const result = await ingestConversationTurn('chat1', 'ok sounds good thanks for doing that for me right now please', 'No problem.');
    expect(result).toBe(false);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('returns false when Gemini returns null (parse failure)', async () => {
    mockCallMemoryLLM.mockResolvedValue('garbage');
    mockParseJson.mockReturnValue(null);
    const result = await ingestConversationTurn('chat1', 'some message that is now sufficiently long to pass the new fifty char guard', 'response');
    expect(result).toBe(false);
    expect(mockSave).not.toHaveBeenCalled();
  });

  // ── Gemini extracts a memory ──────────────────────────────────────

  it('saves a structured memory on valid extraction', async () => {
    const extraction = {
      skip: false,
      summary: 'User prefers dark mode in all applications',
      entities: ['dark mode', 'UI'],
      topics: ['preferences', 'UI'],
      importance: 0.8,
    };
    mockCallMemoryLLM.mockResolvedValue(JSON.stringify(extraction));
    mockParseJson.mockReturnValue(extraction);

    const result = await ingestConversationTurn(
      'chat1',
      'I always want dark mode enabled in every single application I use',
      'Got it, I will remember your dark mode preference.',
    );

    expect(result).toBe(true);
    expect(mockSave).toHaveBeenCalledWith(
      'chat1',
      'I always want dark mode enabled in every single application I use',
      'User prefers dark mode in all applications',
      ['dark mode', 'UI'],
      ['preferences', 'UI'],
      0.8,
      expect.any(Array),
      'conversation',
      'main',
    );
  });

  // ── Importance filtering ──────────────────────────────────────────

  it('skips extraction with importance < 0.3', async () => {
    const extraction = {
      skip: false,
      summary: 'Trivial fact',
      entities: [],
      topics: [],
      importance: 0.25,
    };
    mockCallMemoryLLM.mockResolvedValue(JSON.stringify(extraction));
    mockParseJson.mockReturnValue(extraction);

    const result = await ingestConversationTurn('chat1', 'some trivial message that is long enough to pass fifty character guard', 'ok');
    expect(result).toBe(false);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('skips extraction with importance exactly 0.2 (below 0.3 floor)', async () => {
    const extraction = {
      skip: false,
      summary: 'Low importance fact',
      entities: [],
      topics: [],
      importance: 0.2,
    };
    mockCallMemoryLLM.mockResolvedValue(JSON.stringify(extraction));
    mockParseJson.mockReturnValue(extraction);

    const result = await ingestConversationTurn('chat1', 'some borderline message that is long enough to pass fifty char guard', 'ok');
    expect(result).toBe(false);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('skips extraction with importance exactly 0.3 (below 0.5 floor)', async () => {
    const extraction = {
      skip: false,
      summary: 'Borderline fact',
      entities: [],
      topics: [],
      importance: 0.3,
    };
    mockCallMemoryLLM.mockResolvedValue(JSON.stringify(extraction));
    mockParseJson.mockReturnValue(extraction);

    const result = await ingestConversationTurn('chat1', 'some borderline message that is long enough to pass fifty char guard', 'ok');
    expect(result).toBe(false);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('saves extraction with importance exactly 0.5', async () => {
    const extraction = {
      skip: false,
      summary: 'Useful fact',
      entities: [],
      topics: [],
      importance: 0.5,
    };
    mockCallMemoryLLM.mockResolvedValue(JSON.stringify(extraction));
    mockParseJson.mockReturnValue(extraction);

    const result = await ingestConversationTurn('chat1', 'some useful message that is long enough to pass the fifty char guard', 'ok');
    expect(result).toBe(true);
    expect(mockSave).toHaveBeenCalled();
  });

  // ── Importance clamping ───────────────────────────────────────────

  it('clamps importance above 1.0 to 1.0', async () => {
    const extraction = {
      skip: false,
      summary: 'Very important',
      entities: [],
      topics: [],
      importance: 1.5,
    };
    mockCallMemoryLLM.mockResolvedValue(JSON.stringify(extraction));
    mockParseJson.mockReturnValue(extraction);

    await ingestConversationTurn('chat1', 'extremely important message for testing the system end to end', 'noted');
    expect(mockSave).toHaveBeenCalledWith(
      'chat1',
      expect.any(String),
      'Very important',
      [],
      [],
      1.0,  // clamped
      expect.any(Array),
      'conversation',
      'main',
    );
  });

  it('clamps negative importance to 0', async () => {
    const extraction = {
      skip: false,
      summary: 'Negative importance',
      entities: [],
      topics: [],
      importance: -0.5,
    };
    mockCallMemoryLLM.mockResolvedValue(JSON.stringify(extraction));
    mockParseJson.mockReturnValue(extraction);

    // importance -0.5 < 0.2 threshold, so it should be skipped
    const result = await ingestConversationTurn('chat1', 'message with a negative importance value used in this test scenario', 'response');
    expect(result).toBe(false);
  });

  // ── Validation of required fields ─────────────────────────────────

  it('skips when summary is missing', async () => {
    const extraction = {
      skip: false,
      summary: '',
      entities: [],
      topics: [],
      importance: 0.7,
    };
    mockCallMemoryLLM.mockResolvedValue(JSON.stringify(extraction));
    mockParseJson.mockReturnValue(extraction);

    const result = await ingestConversationTurn('chat1', 'message with no summary extracted from it according to the LLM result', 'response');
    expect(result).toBe(false);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('skips when importance is not a number', async () => {
    const extraction = {
      skip: false,
      summary: 'Valid summary',
      entities: [],
      topics: [],
      importance: 'high' as unknown as number,
    };
    mockCallMemoryLLM.mockResolvedValue(JSON.stringify(extraction));
    mockParseJson.mockReturnValue(extraction);

    const result = await ingestConversationTurn('chat1', 'message where the importance field returned is a string instead of number', 'response');
    expect(result).toBe(false);
    expect(mockSave).not.toHaveBeenCalled();
  });

  // ── Missing optional fields ───────────────────────────────────────

  it('handles missing entities and topics gracefully', async () => {
    const extraction = {
      skip: false,
      summary: 'No entities or topics',
      importance: 0.5,
    };
    mockCallMemoryLLM.mockResolvedValue(JSON.stringify(extraction));
    mockParseJson.mockReturnValue(extraction);

    const result = await ingestConversationTurn('chat1', 'message with no entities or topics at all in the LLM extraction result', 'response');
    expect(result).toBe(true);
    expect(mockSave).toHaveBeenCalledWith(
      'chat1',
      expect.any(String),
      'No entities or topics',
      [],  // defaults to empty
      [],  // defaults to empty
      0.5,
      expect.any(Array),
      'conversation',
      'main',
    );
  });

  // ── Error handling ────────────────────────────────────────────────

  it('returns false when Gemini API throws', async () => {
    mockCallMemoryLLM.mockRejectedValue(new Error('API rate limited'));

    const result = await ingestConversationTurn('chat1', 'this message should not cause the bot to crash regardless of edge cases', 'response');
    expect(result).toBe(false);
    expect(mockSave).not.toHaveBeenCalled();
  });

  // ── Message truncation ────────────────────────────────────────────

  it('truncates long messages to 2000 chars in prompt', async () => {
    mockCallMemoryLLM.mockResolvedValue('{"skip": true}');
    mockParseJson.mockReturnValue({ skip: true });

    const longMsg = 'x'.repeat(5000);
    await ingestConversationTurn('chat1', longMsg, 'response');

    const promptArg = mockCallMemoryLLM.mock.calls[0][0];
    // The prompt should contain the truncated message, not the full 5000 chars
    expect(promptArg).not.toContain('x'.repeat(3000));
    expect(promptArg).toContain('x'.repeat(2000));
  });
});
