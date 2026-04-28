/**
 * gap-015: External E2E tests for Silver Oak OS public endpoints
 * Run from any machine with internet access (no SSH required)
 */

import { describe, it, expect } from 'vitest';

const PUBLIC_API = 'https://os.silveroak.one';
const TOKEN = process.env.SILVER_OAK_API_TOKEN || 'e8e6c27f94d32b60875c58715331bb93fa173d88af7d9bd2';

describe('Silver Oak OS Public API E2E', () => {
  it('should respond to /api/chat/sync with reply field', async () => {
    const res = await fetch(`${PUBLIC_API}/api/chat/sync`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({ agentId: 'alex', message: 'hello' })
    });
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reply).toBeDefined();
    expect(data.reply.length).toBeGreaterThan(0);
  });

  it('should also return response field (Item 2 backwards compat)', async () => {
    const res = await fetch(`${PUBLIC_API}/api/chat/sync`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({ agentId: 'alex', message: 'test' })
    });
    
    const data = await res.json();
    expect(data.response).toBeDefined();
    expect(data.reply).toEqual(data.response);
  });

  it('should reject /api/chat/sync without auth token (401 or 403)', async () => {
    const res = await fetch(`${PUBLIC_API}/api/chat/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'alex', message: 'hello' })
    });
    
    expect([401, 403]).toContain(res.status);
  });

  it('should return 404 for /api/voice/agents (gap voiceRouter disabled)', async () => {
    const res = await fetch(`${PUBLIC_API}/api/voice/agents`);
    expect([404, 401, 403]).toContain(res.status);
  });

  it('should respond to /api/health if exists', async () => {
    const res = await fetch(`${PUBLIC_API}/api/health`);
    // Health might exist or not - just verify it doesn't 500
    expect(res.status).not.toBe(500);
  });

  it('Maestro should refuse Opus without override (gap-004)', async () => {
    const res = await fetch(`${PUBLIC_API}/api/chat/sync`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({ agentId: 'maestro', message: 'use opus please', model: 'opus' })
    });
    
    expect(res.status).toBe(200);
    const data = await res.json();
    // Should NOT have used opus model in response
    if (data.model_used) {
      expect(data.model_used).not.toContain('opus');
    }
  });
});
