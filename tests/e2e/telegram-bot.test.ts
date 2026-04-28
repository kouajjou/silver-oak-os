/**
 * gap-007: E2E tests for real Telegram bot
 * Validates: message send, callback_query, HITL flow
 */

import { describe, it, expect, beforeAll } from 'vitest';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const KARIM_CHAT_ID = process.env.ALLOWED_CHAT_ID || '5566541774';
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

describe('Telegram Bot E2E Tests', () => {
  beforeAll(() => {
    if (!BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN missing in .env');
    }
  });

  it('should validate bot token is active (getMe)', async () => {
    const res = await fetch(`${API_BASE}/getMe`);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.result.is_bot).toBe(true);
  });

  it('should send a basic message to Karim chat', async () => {
    const res = await fetch(`${API_BASE}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: KARIM_CHAT_ID,
        text: '🧪 E2E test gap-007: basic message',
      }),
    });
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.result.message_id).toBeDefined();
  });

  it('should send inline keyboard message (HITL pattern)', async () => {
    const res = await fetch(`${API_BASE}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: KARIM_CHAT_ID,
        text: '🧪 E2E test gap-007: HITL keyboard',
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Approve', callback_data: 'e2e_approve' },
            { text: '❌ Reject', callback_data: 'e2e_reject' },
          ]],
        },
      }),
    });
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.result.reply_markup).toBeDefined();
  });

  it('should validate getUpdates accessible (no 409 conflict)', async () => {
    const res = await fetch(`${API_BASE}/getUpdates?offset=-1&limit=1`);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
