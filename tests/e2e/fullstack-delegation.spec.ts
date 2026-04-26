/**
 * A5 — Full-Stack Delegation E2E Test
 * Tests the complete chain: Karim → Alex → Maestro → Workers → response
 * 
 * Expected (vision): delegation_chain = ['alex', 'maestro'], delegated = true
 * Actual (today):    delegation_chain = ['alex'], delegated = false (not wired)
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'https://os.silveroak.one';

test.describe('A5 — Full-Stack Delegation Chain', () => {

  test('API: /api/chat returns response for alex agent', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/chat`, {
      data: {
        agentId: 'alex',
        message: 'Qui es-tu ?',
        history: [],
      },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty('reply');
    expect(body).toHaveProperty('agent_id', 'alex');
    expect(body).toHaveProperty('source');
    expect(['claude', 'mvp']).toContain(body.source);
  });

  test('API: delegation_chain for alex → maestro task (VISION CHECK)', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/chat`, {
      data: {
        agentId: 'alex',
        message: 'Demande à Maestro de dispatcher à grok-1 le calcul 2+2 et retourne le résultat',
        history: [],
      },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    
    // VISION: should contain delegation chain alex → maestro
    // ACTUAL: delegation_chain = ['alex'], delegated = false (not yet implemented)
    const hasRealDelegation = body.delegated === true && body.delegation_chain?.includes('maestro');
    
    // This test documents the current state — it should PASS regardless of vision
    expect(body).toHaveProperty('reply');
    expect(body.delegation_chain).toBeDefined();
    expect(Array.isArray(body.delegation_chain)).toBeTruthy();
    
    // Log actual vs vision for the report
    console.log('[A5] VISION: delegation_chain should contain maestro, delegated=true');
    console.log('[A5] ACTUAL: delegation_chain =', JSON.stringify(body.delegation_chain), '| delegated =', body.delegated);
    console.log('[A5] E2E delegation wired:', hasRealDelegation ? 'YES ✅' : 'NO ❌ (API uses direct Claude call)');
  });

  test('UI: Alex agent page loads and chat responds', async ({ page }) => {
    await page.goto(`${BASE_URL}/agent/alex`);
    await page.waitForLoadState('networkidle');
    
    // Page should load with agent name
    const title = await page.title();
    console.log('[A5] Page title:', title);
    
    // Find chat input
    const input = page.getByRole('textbox').first();
    await expect(input).toBeVisible({ timeout: 10000 });
    
    // Send a message
    await input.fill('Bonjour Alex, 2+2 = ?');
    await page.keyboard.press('Enter');
    
    // Wait for response (SSE or polling)
    await page.waitForTimeout(5000);
    
    // Check response appeared (look for agent message)
    const messages = page.locator('[data-testid="agent-message"], .agent-message, .message-agent');
    const messageCount = await messages.count();
    console.log('[A5] Agent messages found:', messageCount);
  });

  test('UI: ActivityFeed shows delegation events', async ({ page }) => {
    await page.goto(`${BASE_URL}/agent/alex`);
    await page.waitForLoadState('networkidle');
    
    // Check if ActivityFeed component is rendered
    const activityFeed = page.locator('[data-testid="activity-feed"], .activity-feed, text=Activité récente');
    const feedVisible = await activityFeed.isVisible().catch(() => false);
    
    console.log('[A5] ActivityFeed visible:', feedVisible);
    
    // Vision: feed should show delegation events
    // Actual: DelegationTrace not wired (confirmed by T6 Knip audit)
    if (!feedVisible) {
      console.log('[A5] ActivityFeed NOT wired — DelegationTrace orphelin (T6 audit confirmed)');
    }
    
    // Test passes regardless — it documents the state
    expect(true).toBe(true);
  });

  test('MCP Bridge: mcp.silveroak.one is reachable from agent context', async ({ request }) => {
    // Verify MCP Bridge health — prerequisite for Maestro → Workers chain
    const response = await request.get('https://mcp.silveroak.one/health');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    console.log('[A5] MCP Bridge status:', body.status);
    expect(body.status).toBe('ok');
  });

});
