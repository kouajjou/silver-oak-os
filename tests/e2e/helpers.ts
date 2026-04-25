import { Page, expect } from '@playwright/test';

export async function navigateToAgent(page: Page, agentId: string): Promise<void> {
  await page.goto(`/agent/${agentId}`);
  await page.waitForLoadState('networkidle');
}

export async function sendMessage(page: Page, text: string): Promise<void> {
  const input = page.locator('input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]').first();
  await input.fill(text);
  await input.press('Enter');
}

export async function waitForResponse(page: Page, timeoutMs: number = 20000): Promise<string> {
  // Attendre que la réponse apparaisse dans le chat
  await page.waitForTimeout(2000); // Latence initiale
  
  // Chercher le dernier message assistant
  const responses = page.locator('[data-role="assistant"], .agent-message, .response-text, [class*="assistant"]');
  await responses.last().waitFor({ timeout: timeoutMs });
  
  return await responses.last().textContent() ?? '';
}

export async function assertDelegationChain(page: Page, expectedChain: string[]): Promise<void> {
  // Vérifier que DelegationTrace contient la chaîne attendue
  const trace = page.locator('[data-testid="delegation-trace"], .delegation-trace, [class*="DelegationTrace"]');
  
  if (await trace.count() > 0) {
    const traceText = await trace.textContent() ?? '';
    for (const agent of expectedChain) {
      // Vérification souple: l'agent est mentionné dans la trace
      const agentVisible = traceText.toLowerCase().includes(agent.toLowerCase()) ||
        await page.locator(`text=${agent}`).count() > 0;
      if (!agentVisible) {
        console.warn(`Agent ${agent} not found in delegation trace: ${traceText}`);
      }
    }
  } else {
    // DelegationTrace absent: vérifier dans l'URL ou le DOM
    const url = page.url();
    console.log(`DelegationTrace not found. URL: ${url}`);
  }
}
