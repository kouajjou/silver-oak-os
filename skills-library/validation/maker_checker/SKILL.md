---
name: maker_checker
description: Send a critical action request to Karim via Telegram with inline keyboard for approval/rejection before executing.
triggers: [valider, validation, approve, approuver, confirmer, confirm, hitl, maker checker, vérifier]
allowed-tools: Bash(curl * sqlite3 *)
---

# Maker-Checker Skill

## Purpose

Before executing any critical or irreversible action, get explicit Karim approval via Telegram inline keyboard.

## When to Use

- Sending emails to external parties
- Publishing content publicly
- Changing prices or financial settings
- Deleting or archiving data
- Any action that costs real money (>€50)
- First time an agent contacts a new external service

## Workflow

1. Prepare the action draft
2. Call `requestMakerChecker()` from `src/services/maker_checker.ts`
3. A Telegram message is sent with ✅/❌ buttons
4. In `setup` mode: auto-approved, Karim notified
5. In `runtime` mode: factory pauses until Karim clicks

## Direct Telegram (if no maker_checker service available)

```bash
curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": 5566541774,
    "text": "⚠️ *Validation requise*\n\n*Action*: [describe action]\n*Détails*: [details]\n\nRéponds OK pour confirmer.",
    "parse_mode": "Markdown"
  }'
```

## Notes

- NEVER execute external actions without this check in runtime mode
- Log all checks to `maker_checker_pending` SQLite table
