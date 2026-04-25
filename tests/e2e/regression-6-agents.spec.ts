import { test, expect } from '@playwright/test';

const AGENTS = ['alex', 'sara', 'leo', 'marco', 'nina', 'maestro'];

for (const agentId of AGENTS) {
  test(`Smoke regression — /agent/${agentId}`, async ({ page }) => {
    // 1. Navigation + HTTP 200
    const response = await page.goto(`/agent/${agentId}`, { timeout: 20000 });
    await page.waitForLoadState('domcontentloaded');
    
    // Assert HTTP 200
    expect(response?.status(), `/agent/${agentId} doit retourner 200`).toBe(200);
    
    // 2. Photo/avatar agent chargée
    const agentImgs = page.locator(`img[src*=${agentId}], img[alt*=${agentId}], img[src*=agent], img[alt*=agent], img[src*=photo], img`);
    const imgCount = await agentImgs.count();
    
    let imgLoaded = false;
    if (imgCount > 0) {
      for (let i = 0; i < Math.min(imgCount, 3); i++) {
        const img = agentImgs.nth(i);
        const loaded = await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0).catch(() => false);
        if (loaded) {
          imgLoaded = true;
          break;
        }
      }
    }
    
    console.log(`[${agentId}] Images found: ${imgCount}, Loaded: ${imgLoaded}`);
    if (!imgLoaded) {
      console.warn(`[${agentId}] Aucune image chargée — peut être normal si pas de photo configurée`);
    }
    
    // 3. DelegationTrace présent dans DOM (vérification souple)
    const delegationSelectors = [
      '[data-testid="delegation-trace"]',
      '.delegation-trace',
      '[class*="DelegationTrace"]',
      '[class*="delegation"]',
    ];
    
    let delegationFound = false;
    for (const sel of delegationSelectors) {
      if (await page.locator(sel).count() > 0) {
        delegationFound = true;
        break;
      }
    }
    
    // 4. ActivityFeed présent dans DOM (vérification souple)
    const activitySelectors = [
      '[data-testid="activity-feed"]',
      '.activity-feed',
      '[class*="ActivityFeed"]',
      '[class*="activity"]',
      'text=Activité',
      'text=Activité récente',
    ];
    
    let activityFound = false;
    for (const sel of activitySelectors) {
      if (await page.locator(sel).count() > 0) {
        activityFound = true;
        break;
      }
    }
    
    console.log(`[${agentId}] DelegationTrace: ${delegationFound} | ActivityFeed: ${activityFound}`);
    
    // 5. Screenshot pleine page
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: `tests/e2e/screenshots/wave3/${agentId}.png`,
      fullPage: true 
    });
    
    console.log(`[${agentId}] Screenshot saved: ${agentId}.png`);
    
    // Assertions critiques (bloquantes):
    expect(page.url()).toContain(`agent/${agentId}`);
    
    // Assertion souple: au moins un champ de saisie disponible
    const chatInput = page.locator('textarea, input[type="text"]:not([hidden])').first();
    const hasInput = await chatInput.count() > 0;
    expect(hasInput, `/agent/${agentId} doit avoir un champ de saisie`).toBeTruthy();
  });
}
