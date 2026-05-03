---
name: logify_browser
description: Navigate Logify property management platform to sync reservations, manage cleaning schedules, and track tasks.
triggers: [logify, property management, ménage, nettoyage, cleaning, synchronisation calendrier, sync pms]
allowed-tools: Bash(npx playwright * node *)
---

# Logify Browser Skill

## Purpose

Automate Logify (property management software) interactions for short-term rental operations.

## Authentication

```javascript
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: '/app/silver-oak-os/store/logify-session.json'
});
const page = await context.newPage();
await page.goto('https://app.logify.com');
```

## Key Actions

```javascript
// Check today's check-ins
await page.goto('https://app.logify.com/reservations?status=checkin_today');
const checkins = await page.$$eval('.reservation-card', cards =>
  cards.map(c => ({
    guest: c.querySelector('.guest-name')?.textContent,
    property: c.querySelector('.property-name')?.textContent,
    time: c.querySelector('.checkin-time')?.textContent
  }))
);

// Check cleaning tasks
await page.goto('https://app.logify.com/tasks?type=cleaning');
```

## HITL Requirement

Any action that modifies reservations, sends messages to guests, or updates task status requires Karim validation first.
