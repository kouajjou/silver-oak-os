---
name: telegram_draft
description: Draft and send Telegram messages to Karim or to other agents. Supports text, documents, photos.
triggers: [telegram, notifie, notify, alerte, alert, message, envoie telegram]
allowed-tools: Bash(curl *)
---

# Telegram Draft Skill

## Purpose

Send messages, documents, and photos via Telegram to Karim (chat_id: 5566541774) or other agents.

## Commands

```bash
# Send text message
curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{"chat_id": 5566541774, "text": "Message here", "parse_mode": "Markdown"}'

# Send document
curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument" \
  -F "chat_id=5566541774" \
  -F "caption=Document description" \
  -F "document=@/path/to/file.pdf"

# Send photo
curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto" \
  -F "chat_id=5566541774" \
  -F "photo=@/path/to/image.png"
```

## Notes

- Always use TELEGRAM_BOT_TOKEN from .env
- For long messages, split at 4096 chars (Telegram limit)
- Markdown supported: `*bold*`, `_italic_`, `` `code` ``
