---
name: playwright_navigate
description: Navigate web pages with Playwright browser automation. Click, fill forms, extract content.
triggers: [playwright, browse, naviguer, clique, click, form, fill, scrape, page web, browser]
allowed-tools: Bash(npx playwright *)
---

# Playwright Navigate Skill

## Purpose

Automate web browser interactions: navigate, click, fill forms, extract data.

## Quick Start

```bash
# Run a Playwright script
npx playwright test /tmp/script.ts --reporter=list

# Or via node
node /tmp/playwright-script.mjs
```

## Code Template

```javascript
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('https://example.com');
await page.click('button#submit');
await page.fill('input[name="email"]', 'test@example.com');

const text = await page.textContent('h1');
console.log(text);

await browser.close();
```

## Notes

- Always `await browser.close()` to avoid zombie processes
- Use `headless: true` for server environments
- Screenshots: `await page.screenshot({ path: '/tmp/shot.png' })`
- Timeout: `page.setDefaultTimeout(30000)` (30s)
