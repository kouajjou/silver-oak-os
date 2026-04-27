# Silver Oak OS — Scripts

This directory contains utility scripts for Silver Oak OS automation and maintenance.

---

## auto-rollback.sh (gap-018)

Reusable bash helpers for any future wiring script with automatic git rollback.

### Quick start

```bash
#!/bin/bash
source /app/silver-oak-os/scripts/auto-rollback.sh

# 1. Save state BEFORE modifications
save_git_state "feature/my-feature"

# 2. Apply changes...
sed -i 's/old/new/' src/bot.ts
npx tsc

# 3. DoD checks — auto-rollback on failure
if ! dod_check "tsc" "npx tsc --noEmit"; then
  rollback_to_saved_state "tsc errors after patch"
  exit 1
fi

if ! dod_check "api_health" "curl -sf --max-time 5 http://localhost:3141/api/chat/sync"; then
  rollback_to_saved_state "API not responding"
  exit 1
fi

echo "All DoD checks passed ✅"
```

### API reference

#### `save_git_state [label] [repo_dir]`

Saves current `HEAD` commit hash and branch name into shell variables.
Call this **before** any modification.

| Param | Default | Description |
|-------|---------|-------------|
| `label` | `"unnamed"` | Descriptive tag for the log |
| `repo_dir` | auto-detected | Path to git repo root |

**Returns:** `0` on success, `1` if not in a git repo.

#### `rollback_to_saved_state [reason] [repo_dir]`

Reverts `git checkout <saved_branch>` + `git reset --hard <saved_commit>`.
Sends a Telegram notification to Karim with branch, commit, timestamp, and log path.
Clears saved state variables after rollback.

| Param | Default | Description |
|-------|---------|-------------|
| `reason` | `"DoD check failed"` | Reason string shown in Telegram |
| `repo_dir` | auto-detected | Path to git repo root |

**Returns:** `0` on success, `1` if no saved state.

#### `dod_check <test_name> <command>`

Runs `command` in a subshell. Logs `DOD_PASS` or `DOD_FAIL` to the log file.
Prints `✅` or `❌` to stdout.

| Param | Description |
|-------|-------------|
| `test_name` | Short identifier shown in logs and output |
| `command` | Any shell command; passes if exit code is 0 |

**Returns:** `0` if PASS, `1` if FAIL.

### Standalone modes

```bash
# Verify script syntax without doing anything
bash scripts/auto-rollback.sh --dry-run

# Test save_git_state only (safe — no rollback)
bash scripts/auto-rollback.sh --test
```

### Telegram notification

When `rollback_to_saved_state` is called, an HTML message is sent automatically:
- Token read from `.env` → `TELEGRAM_BOT_TOKEN`
- Chat ID read from `.env` → `ALLOWED_CHAT_ID`
- Falls back to env vars if `.env` not found

### Logs

All events appended to `/var/log/silver-oak-rollback.log`:

```
[2026-04-27 20:24:31] STATE_SAVED label=my-feature branch=feature/x commit=9e5d3e00 ts=...
[2026-04-27 20:24:32] DOD_PASS tsc
[2026-04-27 20:24:33] DOD_FAIL api_health
[2026-04-27 20:24:33] ROLLBACK_START reason=API not responding current=feature/x saved=feature/x
[2026-04-27 20:24:33] ROLLBACK_COMPLETE branch=feature/x commit=9e5d3e00
```

### Reuse targets

| Gap | Description |
|-----|-------------|
| gap-020 | SQLite budget tracking |
| gap-013 | MCP Bridge Factory |
| Any future feature wiring | Add `source auto-rollback.sh` at the top |

---

## Other scripts

| Script | Purpose |
|--------|---------|
| `notify.sh` | Send a Telegram message mid-task |
| `notify-agent-hook.sh` | PreToolUse hook — notifies when Claude spawns sub-agent |
| `pre-commit-check.sh` | Git pre-commit type/lint checks |
| `agent-create.sh` | Create a new agent folder + CLAUDE.md |
| `agent-service.sh` | Manage PM2 agent process lifecycle |
| `install-launchd.sh` | macOS launchd service install |
| `uninstall-launchd.sh` | macOS launchd service uninstall |
| `uninstall.sh` | Full uninstall Silver Oak OS |
| `run-tunnel.sh` | Start ngrok / cloudflared tunnel |
