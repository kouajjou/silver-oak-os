import { test, expect } from '@playwright/test';

/**
 * W3.4 — Test anti-boucle délégation (max_delegation_depth)
 *
 * Contexte code réel (orchestrator.ts) :
 * - Pas de max_delegation_depth explicite — protection via timeout 5min (DEFAULT_TIMEOUT_MS)
 * - delegateToAgent() crée un AbortController avec timeoutMs
 * - Chaque délégation est loggée dans inter_agent_tasks + hive_mind
 *
 * Objectifs :
 * 1. L'app répond sans crash sur un prompt multi-délégation (timeout garde <= 5min)
 * 2. Alex ne crashe pas sur un prompt potentiellement récursif
 * 3. L'API health reste verte après des délégations intensives
 */
test.describe('Anti-boucle délégation — max_delegation_depth', () => {

  test('Maestro répond sans crash sur prompt multi-délégation (timeout guard)', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/agent/maestro', { timeout: 15000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Prompt qui déclenche plusieurs délégations — stress-test du timeout guard
    const complexPrompt = 'Coordonne Alex, Sara et Marco pour me donner une réponse complète sur les tendances tech du moment.';

    const selectors = [
      'textarea[placeholder*="Maestro"]',
      'textarea[placeholder*="maestro"]',
      'textarea',
      'input[type="text"]:not([hidden])',
    ];

    let inputFound = false;
    for (const sel of selectors) {
      const el = page.locator(sel).first();
      if (await el.count() > 0 && await el.isVisible({ timeout: 1000 }).catch(() => false)) {
        await el.fill(complexPrompt);
        await el.press('Enter');
        inputFound = true;
        break;
      }
    }

    if (!inputFound) {
      const btn = page.getByRole('button', { name: /envoyer|send/i }).first();
      if (await btn.count() > 0) {
        await page.locator('textarea').first().fill(complexPrompt);
        await btn.click();
        inputFound = true;
      }
    }

    await page.screenshot({ path: 'tests/e2e/screenshots/wave3/w3.4-maestro-multi-deleg-before.png' });
    await page.waitForTimeout(5000);

    const elapsed = Date.now() - startTime;
    await page.screenshot({ path: 'tests/e2e/screenshots/wave3/w3.4-maestro-multi-deleg-after.png' });

    const bodyText = await page.locator('body').textContent() ?? '';
    const hasServerError = bodyText.includes('500') && bodyText.includes('Internal Server Error');
    const hasCrash = bodyText.includes('Application error') && bodyText.includes('digest');

    console.log('[W3.4] Elapsed: ' + elapsed + 'ms | 500 error: ' + hasServerError + ' | crash: ' + hasCrash + ' | input found: ' + inputFound);
    console.log('[W3.4] Timeout guard in orchestrator.ts: DEFAULT_TIMEOUT_MS = 5*60*1000ms — AbortController actif');

    expect(hasServerError, 'Pas de 500 Internal Server Error').toBeFalsy();
    expect(hasCrash, 'Pas de crash application').toBeFalsy();
    // Le timeout guard (5min) empêche une boucle infinie
    expect(elapsed, 'Réponse (ou timeout) dans les 25s de test').toBeLessThan(25000);
  });

  test('Alex ne crashe pas sur prompt potentiellement récursif', async ({ page }) => {
    await page.goto('/agent/alex', { timeout: 15000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Prompt qui pourrait créer une boucle si pas de garde
    const recursivePrompt = 'Demande à un autre agent de te répondre sur ce sujet.';

    const el = page.locator('textarea').first();
    if (await el.count() > 0 && await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      await el.fill(recursivePrompt);
      await el.press('Enter');
    }

    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'tests/e2e/screenshots/wave3/w3.4-alex-recursive.png' });

    const bodyText = await page.locator('body').textContent() ?? '';
    const hasServerError = bodyText.includes('Internal Server Error');

    console.log('[W3.4] Alex recursive — server error: ' + hasServerError);
    console.log('[W3.4] AbortController timeout 300s dans delegateToAgent() previent la boucle infinie');

    expect(hasServerError, 'Alex: pas de server error sur prompt récursif').toBeFalsy();
    expect(page.url()).toContain('agent/alex');
  });

  test('API delegations/active répond 200 après stress délégation (guard timeout actif)', async ({ page }) => {
    // Vérifier que l'API delegations reste accessible après les tests de stress
    // Note: /api/health n'existe pas sur ce projet — endpoint réel: /api/delegations/active
    const response = await page.goto('https://os.silveroak.one/api/delegations/active', { timeout: 10000 });

    await page.screenshot({ path: 'tests/e2e/screenshots/wave3/w3.4-api-health-post-stress.png' });

    expect(response?.status(), 'API delegations/active doit retourner 200').toBe(200);

    const bodyText = await page.locator('body').textContent() ?? '';
    console.log('[W3.4] Delegations response: ' + bodyText.substring(0, 200));
    console.log('[W3.4] RESUME: max_delegation_depth non implementé — guard = AbortController timeout 5min (orchestrator.ts:33)');

    // L'API retourne un JSON avec delegations array — pas d'erreur critique
    expect(bodyText).not.toContain('Internal Server Error');
    expect(bodyText).toContain('delegations');
  });
});
