---
name: pricelab_browser
description: Navigate PriceLab dynamic pricing dashboard to check revenue, adjust base prices, and review market data.
triggers: [pricelab, prix dynamique, dynamic pricing, revenu locatif, occupancy, tarif, taux occupation]
allowed-tools: Bash(npx playwright * node *)
---

# PriceLab Browser Skill

## Purpose

Automate PriceLab dynamic pricing interactions: check revenue stats, review base price recommendations, analyze occupancy.

## Authentication

```javascript
import { chromium } from 'playwright';

const context = await chromium.launch({ headless: true }).newContext({
  storageState: '/app/silver-oak-os/store/pricelab-session.json'
});
const page = await context.newPage();
await page.goto('https://app.pricelabs.co');
```

## Key Actions

```javascript
// View revenue dashboard
await page.goto('https://app.pricelabs.co/dashboard');

// Check listing performance
await page.goto('https://app.pricelabs.co/listings');
const stats = await page.$$eval('.listing-row', rows =>
  rows.map(r => ({
    name: r.querySelector('.listing-name')?.textContent,
    basePrice: r.querySelector('.base-price')?.textContent,
    occupancy: r.querySelector('.occupancy-rate')?.textContent,
  }))
);
```

## HITL Required

Price changes require Karim's explicit approval before applying. Always draft the change and show current vs. proposed price.

## Output Format

```
Listing: [Name]
Current base price: €XX/night
PriceLab recommendation: €XX/night
Occupancy (30 days): XX%
Action needed: [description]
```
