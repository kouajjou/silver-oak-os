---
name: gmail_label
description: Apply, remove, or create Gmail labels on threads. Useful for inbox triage and organization.
triggers: [label, archive, triage, inbox, tag, marquer, étiquette]
allowed-tools: Bash(CLAUDECLAW_DIR=* ~/.venv/bin/python3 ~/.config/gmail/gmail.py *)
---

# Gmail Label Skill

## Purpose

Manage Gmail labels for inbox organization and triage.

## Commands

```bash
# List all labels
CLAUDECLAW_DIR=/app/silver-oak-os ~/.venv/bin/python3 ~/.config/gmail/gmail.py labels

# Apply label to thread
CLAUDECLAW_DIR=/app/silver-oak-os ~/.venv/bin/python3 ~/.config/gmail/gmail.py label \
  --thread-id <id> --label "IMPORTANT"

# Archive a thread (remove from INBOX)
CLAUDECLAW_DIR=/app/silver-oak-os ~/.venv/bin/python3 ~/.config/gmail/gmail.py archive \
  --thread-id <id>

# Mark as read
CLAUDECLAW_DIR=/app/silver-oak-os ~/.venv/bin/python3 ~/.config/gmail/gmail.py mark-read \
  --thread-id <id>
```
