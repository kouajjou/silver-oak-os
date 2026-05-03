---
name: google_calendar
description: Read and manage Google Calendar events. List schedule, create events, check availability.
triggers: [calendrier, calendar, agenda, rdv, rendez-vous, meeting, réunion, disponibilité, schedule, event]
allowed-tools: Bash(CLAUDECLAW_DIR=* ~/.venv/bin/python3 ~/.config/gcal/gcal.py *)
---

# Google Calendar Skill

## Purpose

Manage Karim's Google Calendar: view schedule, create/update events, check availability.

## Commands

```bash
# Today's events
CLAUDECLAW_DIR=/app/silver-oak-os ~/.venv/bin/python3 ~/.config/gcal/gcal.py list --days 1

# Next 7 days
CLAUDECLAW_DIR=/app/silver-oak-os ~/.venv/bin/python3 ~/.config/gcal/gcal.py list --days 7

# Create event
CLAUDECLAW_DIR=/app/silver-oak-os ~/.venv/bin/python3 ~/.config/gcal/gcal.py create \
  --title "Meeting with X" \
  --start "2026-05-03T14:00:00" \
  --end "2026-05-03T15:00:00" \
  --description "Discussion about Y"

# Check free slots
CLAUDECLAW_DIR=/app/silver-oak-os ~/.venv/bin/python3 ~/.config/gcal/gcal.py free \
  --date "2026-05-03" \
  --duration 60
```

## Output

JSON: `id`, `title`, `start`, `end`, `location`, `description`, `attendees`.

## HITL

Creating or modifying events requires Karim confirmation before writing.
