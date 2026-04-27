#!/bin/bash
# Silver Oak OS — Auto-rollback git workflow (gap-018)
#
# Usage (sourced):
#   source /app/silver-oak-os/scripts/auto-rollback.sh
#   save_git_state "feature/my-branch"
#   ... your modifs ...
#   if ! dod_check "tsc" "npx tsc --noEmit"; then rollback_to_saved_state; fi
#
# Usage (standalone modes):
#   bash auto-rollback.sh --dry-run   # syntax check only
#   bash auto-rollback.sh --test      # test save_git_state, no rollback

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"
LOG_FILE="/var/log/silver-oak-rollback.log"

# Module-level saved state
SAVED_COMMIT=""
SAVED_BRANCH=""
SAVED_TIMESTAMP=""

# ─── Internal helpers ────────────────────────────────────────────────────────

_log() {
  local message="$1"
  local timestamp
  timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$timestamp] $message" | tee -a "$LOG_FILE" 2>/dev/null
}

_telegram_notify() {
  local message="$1"
  local token chat_id

  # Read from .env (same pattern as notify.sh)
  if [ -f "$ENV_FILE" ]; then
    token=$(grep -E '^TELEGRAM_BOT_TOKEN=' "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    chat_id=$(grep -E '^ALLOWED_CHAT_ID=' "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
  fi

  # Fallback to env vars if .env not found
  token="${token:-$TELEGRAM_BOT_TOKEN}"
  chat_id="${chat_id:-$ALLOWED_CHAT_ID}"

  if [ -z "$token" ] || [ -z "$chat_id" ]; then
    _log "TELEGRAM_SKIP — no token or chat_id"
    return 1
  fi

  curl -s -X POST "https://api.telegram.org/bot${token}/sendMessage" \
    -d "chat_id=${chat_id}" \
    -d "text=${message}" \
    -d "parse_mode=HTML" > /dev/null 2>&1
}

# ─── Public API ──────────────────────────────────────────────────────────────

# Save current git commit + branch before making changes.
# Call this BEFORE any modification.
# Args: $1 = descriptive label (optional, for logging only)
save_git_state() {
  local label="${1:-unnamed}"
  local repo_dir="${2:-$(git rev-parse --show-toplevel 2>/dev/null)}"

  if [ -z "$repo_dir" ]; then
    _log "STATE_SAVE_FAILED — not inside a git repo (label=$label)"
    echo "❌ save_git_state: not inside a git repo" >&2
    return 1
  fi

  SAVED_COMMIT=$(git -C "$repo_dir" rev-parse HEAD 2>/dev/null)
  SAVED_BRANCH=$(git -C "$repo_dir" branch --show-current 2>/dev/null)
  SAVED_TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')

  if [ -z "$SAVED_COMMIT" ]; then
    _log "STATE_SAVE_FAILED — git rev-parse HEAD empty (label=$label)"
    echo "❌ save_git_state: could not read HEAD commit" >&2
    return 1
  fi

  _log "STATE_SAVED label=$label branch=$SAVED_BRANCH commit=${SAVED_COMMIT:0:8} ts=$SAVED_TIMESTAMP"
  echo "✅ Git state saved: $SAVED_BRANCH @ ${SAVED_COMMIT:0:8} ($SAVED_TIMESTAMP)"
  return 0
}

# Revert to the state saved by save_git_state().
# Also sends a Telegram notification and appends to log.
# Call this when a DoD check fails.
rollback_to_saved_state() {
  local reason="${1:-DoD check failed}"
  local repo_dir="${2:-$(git rev-parse --show-toplevel 2>/dev/null)}"

  if [ -z "$SAVED_COMMIT" ] || [ -z "$SAVED_BRANCH" ]; then
    _log "ROLLBACK_FAILED — no saved state (call save_git_state first)"
    echo "❌ rollback_to_saved_state: no saved state — call save_git_state first" >&2
    return 1
  fi

  local current_branch
  current_branch=$(git -C "$repo_dir" branch --show-current 2>/dev/null)

  _log "ROLLBACK_START reason=$reason current=$current_branch saved=$SAVED_BRANCH commit=${SAVED_COMMIT:0:8}"

  git -C "$repo_dir" checkout "$SAVED_BRANCH" 2>&1 | tail -1
  git -C "$repo_dir" reset --hard "$SAVED_COMMIT" 2>&1 | tail -1

  _log "ROLLBACK_COMPLETE branch=$SAVED_BRANCH commit=${SAVED_COMMIT:0:8}"
  echo "🔴 Rolled back to $SAVED_BRANCH @ ${SAVED_COMMIT:0:8}"

  local tg_message
  tg_message="🔴 <b>AUTO-ROLLBACK</b> Silver Oak OS
<b>Reason:</b> $reason
<b>Branch:</b> $SAVED_BRANCH
<b>Commit:</b> ${SAVED_COMMIT:0:8}
<b>Time:</b> $(date '+%H:%M:%S UTC')
<b>Log:</b> $LOG_FILE"

  _telegram_notify "$tg_message"

  # Clear saved state after rollback
  SAVED_COMMIT=""
  SAVED_BRANCH=""
  SAVED_TIMESTAMP=""

  return 0
}

# Run a DoD (Definition of Done) check.
# Args: $1 = test name (for log), $2 = shell command to evaluate
# Returns: 0 if PASS, 1 if FAIL
dod_check() {
  local test_name="$1"
  local command="$2"

  if [ -z "$test_name" ] || [ -z "$command" ]; then
    echo "❌ dod_check: usage: dod_check <test_name> <command>" >&2
    return 1
  fi

  if eval "$command" > /dev/null 2>&1; then
    _log "DOD_PASS $test_name"
    echo "✅ DoD [$test_name] : PASS"
    return 0
  else
    _log "DOD_FAIL $test_name"
    echo "❌ DoD [$test_name] : FAIL"
    return 1
  fi
}

# ─── Standalone modes ────────────────────────────────────────────────────────

if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  # Script executed directly (not sourced)

  case "${1:-}" in
    --dry-run)
      echo "✅ Auto-rollback script syntax OK (dry-run)"
      exit 0
      ;;
    --test)
      cd /app/silver-oak-os 2>/dev/null || true
      save_git_state "gap-018-test-mode"
      if [ -n "$SAVED_COMMIT" ]; then
        echo "✅ Test save OK. Saved: $SAVED_BRANCH @ ${SAVED_COMMIT:0:8}"
        exit 0
      else
        echo "❌ Test save FAILED"
        exit 1
      fi
      ;;
    *)
      echo "Silver Oak OS Auto-rollback (gap-018)"
      echo ""
      echo "Usage:"
      echo "  source auto-rollback.sh          # load helpers"
      echo "  bash auto-rollback.sh --dry-run  # syntax check"
      echo "  bash auto-rollback.sh --test     # test save_git_state"
      echo ""
      echo "Helpers: save_git_state, rollback_to_saved_state, dod_check"
      exit 0
      ;;
  esac
else
  # Script is being sourced — announce available helpers
  echo "✅ auto-rollback.sh loaded: save_git_state | rollback_to_saved_state | dod_check"
fi
