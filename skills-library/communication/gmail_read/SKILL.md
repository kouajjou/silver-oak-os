---
name: gmail_read
description: Read Gmail inbox, list threads, search emails, get specific messages. Returns structured JSON.
triggers: [gmail, inbox, email, mail, courrier, lire, read, messages]
allowed-tools: Bash(CLAUDECLAW_DIR=* ~/.venv/bin/python3 ~/.config/gmail/gmail.py *)
---

# Gmail Read Skill

## Purpose

Read and search emails from Gmail inbox via the gmail.py CLI tool.

## Commands

```bash
# List recent inbox threads
CLAUDECLAW_DIR=/app/silver-oak-os ~/.venv/bin/python3 ~/.config/gmail/gmail.py list --max 10

# Get a specific thread
CLAUDECLAW_DIR=/app/silver-oak-os ~/.venv/bin/python3 ~/.config/gmail/gmail.py get --thread-id <id>

# Search emails
CLAUDECLAW_DIR=/app/silver-oak-os ~/.venv/bin/python3 ~/.config/gmail/gmail.py search --query "from:karim subject:urgent"
```

## Output

JSON with fields: `thread_id`, `from`, `to`, `subject`, `snippet`, `date`, `labels`, `body` (for get).

## Notes

- Always use `CLAUDECLAW_DIR=/app/silver-oak-os` prefix
- Max 50 threads per list call
- Attachments are not downloaded, only metadata
