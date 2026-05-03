---
name: airbnb_browser
description: Navigate Airbnb host dashboard to check reservations, messages, pricing, calendar, and listings.
triggers: [airbnb, réservation, reservation, hôte, host, logement, locataire, calendrier airbnb, pricing airbnb]
allowed-tools: Bash(npx playwright * node *)
---

# Airbnb Browser Skill

## Purpose

Automate Airbnb host dashboard interactions: check reservations, read guest messages, update calendar, review pricing.

## Authentication

Airbnb session cookies must be stored. Use saved session:

```javascript
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: '/app/silver-oak-os/store/airbnb-session.json'
});
const page = await context.newPage();
```

## Key URLs

| Action | URL |
|--------|-----|
| Reservations | `https://www.airbnb.fr/hosting/reservations` |
| Inbox | `https://www.airbnb.fr/hosting/inbox` |
| Calendar | `https://www.airbnb.fr/multicalendar` |
| Stats | `https://www.airbnb.fr/hosting/stats` |
| Listings | `https://www.airbnb.fr/hosting/listings` |

## HITL Requirement

All actions that MODIFY data (pricing, availability, messages to guests) require Karim's validation via Telegram before execution.

## Session Renewal

If session expired, send alert to Karim: "Airbnb session expired — need manual login at airbnb.fr to renew cookies."
