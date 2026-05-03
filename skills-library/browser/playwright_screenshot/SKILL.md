---
name: playwright_screenshot
description: Take screenshots of web pages with Playwright. Full-page, element, or viewport captures.
triggers: [screenshot, capture, photo page, snapshot, screen capture]
allowed-tools: Bash(npx playwright * node *)
---

# Playwright Screenshot Skill

## Purpose

Capture screenshots of web pages for visual documentation, testing, or sharing.

## Commands

```javascript
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });

// Navigate
await page.goto('https://example.com', { waitUntil: 'networkidle' });

// Full page screenshot
await page.screenshot({ path: '/tmp/fullpage.png', fullPage: true });

// Viewport only
await page.screenshot({ path: '/tmp/viewport.png' });

// Element screenshot
const element = await page.$('.main-content');
await element?.screenshot({ path: '/tmp/element.png' });

await browser.close();
```

## Send to Karim

```
[SEND_PHOTO:/tmp/screenshot.png|Screenshot de example.com]
```
