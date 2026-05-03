---
name: gmail_compose
description: Compose and send emails via Gmail. Supports reply, forward, and new thread. Always draft first.
triggers: [envoie, envoyer, send, compose, reply, répondre, forward, rédige, draft, email]
allowed-tools: Bash(CLAUDECLAW_DIR=* ~/.venv/bin/python3 ~/.config/gmail/gmail.py *)
---

# Gmail Compose Skill

## Purpose

Compose and send emails from Karim's Gmail account.

## MANDATORY WORKFLOW

1. Compose the draft (show to Karim in Telegram)
2. Wait for explicit "OK send" confirmation
3. Then execute the send command

NEVER send without Karim's explicit OK.

## Commands

```bash
# Send a new email
CLAUDECLAW_DIR=/app/silver-oak-os ~/.venv/bin/python3 ~/.config/gmail/gmail.py send \
  --to "recipient@example.com" \
  --subject "Subject line" \
  --body "Email body text"

# Reply to a thread
CLAUDECLAW_DIR=/app/silver-oak-os ~/.venv/bin/python3 ~/.config/gmail/gmail.py reply \
  --thread-id <id> \
  --body "Reply text"
```

## Output

JSON with `message_id`, `thread_id`, `status`.
