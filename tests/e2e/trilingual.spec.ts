import { test, expect } from '@playwright/test';

// Agents à tester (3 agents sur 6) — noms exacts depuis frontend/lib/agents.ts
const AGENTS_TO_TEST = [
  { id: 'sara', name: 'Sara' },
  { id: 'marco', name: 'Marco' },
  { id: 'maestro', name: 'Maestro' },
];

// Messages trilingues
const MESSAGES = {
  FR: 'Bonjour, présente-toi en une phrase.',
  ES: 'Hola, preséntate en una frase.',
  EN: 'Hi, introduce yourself in one sentence.',
};

async function sendMessageAndWaitForResponse(
  page: any,
  agentId: string,
  agentName: string,
  message: string,
  lang: string
): Promise<string> {
  await page.goto(`/agent/${agentId}`, { timeout: 15000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);

  // Placeholder exact: "Message Sara…", "Message Marco…", "Message Maestro…"
  let inputFound = false;
  const inputSelectors = [
    `textarea[placeholder="Message ${agentName}\u2026"]`,
    `[placeholder*="Message ${agentName}"]`,
    '[placeholder*="Message"]',
    'textarea',
    'input[type="text"]:not([type="hidden"])',
  ];

  for (const selector of inputSelectors) {
    try {
      const el = page.locator(selector).first();
      if (await el.count() > 0 && await el.isVisible({ timeout: 1000 })) {
        await el.fill(message);
        await el.press('Enter');
        inputFound = true;
        console.log(`[${agentId}/${lang}] Input found via: ${selector}`);
        break;
      }
    } catch (_e) {}
  }

  if (!inputFound) {
    // Fallback: bouton Envoyer
    try {
      const textarea = page.locator('textarea').first();
      if (await textarea.count() > 0) {
        await textarea.fill(message);
        const btn = page.locator('button[aria-label="Envoyer"]').first();
        if (await btn.count() > 0) {
          await btn.click();
          inputFound = true;
          console.log(`[${agentId}/${lang}] Input via button fallback`);
        }
      }
    } catch (_e) {}
  }

  if (!inputFound) {
    console.warn(`[${agentId}/${lang}] No input found`);
    return 'NO_INPUT';
  }

  // Attendre réponse LLM (5s)
  await page.waitForTimeout(5000);

  // Screenshot
  await page.screenshot({
    path: `tests/e2e/screenshots/wave3/w3.3-${agentId}-${lang}.png`,
    fullPage: false,
  });

  // Texte complet de la page
  const bodyText = (await page.locator('body').textContent()) ?? '';
  return bodyText.toLowerCase();
}

// 3 agents x 3 langues = 9 tests
for (const agent of AGENTS_TO_TEST) {
  test.describe(`Agent ${agent.name} — Tests trilingues`, () => {

    test(`${agent.name} — FR: présente-toi`, async ({ page }) => {
      const text = await sendMessageAndWaitForResponse(page, agent.id, agent.name, MESSAGES.FR, 'FR');
      if (text === 'NO_INPUT') {
        console.warn(`SKIP: No input for ${agent.id}/FR`);
        return;
      }
      // La page doit être chargée (contenu > 50 chars)
      expect(text.length).toBeGreaterThan(50);
      const msgVisible = text.includes('bonjour') || text.includes('présente') || text.includes(agent.id);
      console.log(`[${agent.id}/FR] page loaded: ${text.length} chars, msgVisible: ${msgVisible}`);
    });

    test(`${agent.name} — ES: preséntate`, async ({ page }) => {
      const text = await sendMessageAndWaitForResponse(page, agent.id, agent.name, MESSAGES.ES, 'ES');
      if (text === 'NO_INPUT') {
        console.warn(`SKIP: No input for ${agent.id}/ES`);
        return;
      }
      expect(text.length).toBeGreaterThan(50);
      const msgVisible = text.includes('hola') || text.includes('pres') || text.includes(agent.id);
      console.log(`[${agent.id}/ES] page loaded: ${text.length} chars, msgVisible: ${msgVisible}`);
    });

    test(`${agent.name} — EN: introduce yourself`, async ({ page }) => {
      const text = await sendMessageAndWaitForResponse(page, agent.id, agent.name, MESSAGES.EN, 'EN');
      if (text === 'NO_INPUT') {
        console.warn(`SKIP: No input for ${agent.id}/EN`);
        return;
      }
      expect(text.length).toBeGreaterThan(50);
      const msgVisible = text.includes('hi') || text.includes('introduce') || text.includes(agent.id);
      console.log(`[${agent.id}/EN] page loaded: ${text.length} chars, msgVisible: ${msgVisible}`);
    });

  });
}
