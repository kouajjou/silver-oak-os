#!/usr/bin/env bash
# SOP V26.3 - Audit secrets dans codebase
# Scan tracked files for API keys, tokens, passwords
# Exit code 0 = clean, 1 = secrets found

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "==========================="
echo "= AUDIT SECRETS Silver Oak"
echo "==========================="

FOUND_COUNT=0
declare -a FINDINGS

# Exclude: .env, node_modules, test files (legitimate test fixtures)
EXCLUDE_PAT="\.env$|node_modules|\.test\.ts$|\.spec\.ts$|__tests__|test/|_archive/|dist/|scripts/audit-secrets\.sh$"

# Pattern 1: Anthropic API keys
ANTHROPIC=$(git ls-files | xargs grep -l "sk-ant-[a-zA-Z0-9_-]\{20,\}" 2>/dev/null | grep -vE "$EXCLUDE_PAT" || true)
if [ -n "$ANTHROPIC" ]; then
  FOUND_COUNT=$((FOUND_COUNT+1))
  FINDINGS+=("Anthropic key in: $ANTHROPIC")
fi

# Pattern 2: OpenAI API keys
OPENAI=$(git ls-files | xargs grep -l "sk-proj-[a-zA-Z0-9_-]\{20,\}\|sk-[A-Z0-9][a-zA-Z0-9]\{40,\}" 2>/dev/null | grep -vE "$EXCLUDE_PAT" || true)
if [ -n "$OPENAI" ]; then
  FOUND_COUNT=$((FOUND_COUNT+1))
  FINDINGS+=("OpenAI key in: $OPENAI")
fi

# Pattern 3: DeepSeek/Mistral/etc generic
GENERIC=$(git ls-files | xargs grep -lE "_API_KEY\s*=\s*[\"']sk-[a-zA-Z0-9_-]{20,}" 2>/dev/null | grep -vE "$EXCLUDE_PAT" || true)
if [ -n "$GENERIC" ]; then
  FOUND_COUNT=$((FOUND_COUNT+1))
  FINDINGS+=("Generic API key in: $GENERIC")
fi

# Pattern 4: Telegram bot tokens
TELEGRAM=$(git ls-files | xargs grep -lE "[0-9]{9,10}:[A-Za-z0-9_-]{30,}" 2>/dev/null | grep -vE "$EXCLUDE_PAT" || true)
if [ -n "$TELEGRAM" ]; then
  FOUND_COUNT=$((FOUND_COUNT+1))
  FINDINGS+=("Telegram bot token in: $TELEGRAM")
fi

# Pattern 5: Generic passwords
PASSWORDS=$(git ls-files | xargs grep -lE "password\s*=\s*[\"']\w{8,}" 2>/dev/null | grep -vE "$EXCLUDE_PAT" | head -5 || true)
if [ -n "$PASSWORDS" ]; then
  FOUND_COUNT=$((FOUND_COUNT+1))
  FINDINGS+=("Possible passwords in: $PASSWORDS")
fi

# Pattern 6: SSH/private keys
SSHKEYS=$(git ls-files | xargs grep -l "BEGIN.*PRIVATE KEY\|BEGIN RSA" 2>/dev/null | grep -vE "$EXCLUDE_PAT" || true)
if [ -n "$SSHKEYS" ]; then
  FOUND_COUNT=$((FOUND_COUNT+1))
  FINDINGS+=("Private key in: $SSHKEYS")
fi

# Verifier .env not tracked
TRACKED_ENV=$(git ls-files .env 2>/dev/null || true)
if [ -n "$TRACKED_ENV" ]; then
  FOUND_COUNT=$((FOUND_COUNT+1))
  FINDINGS+=(".env IS TRACKED in git - CRITICAL")
fi

if [ "$FOUND_COUNT" -gt 0 ]; then
  echo "SECRETS FOUND ($FOUND_COUNT issues):"
  for f in "${FINDINGS[@]}"; do
    echo "  - $f"
  done
  echo ""
  echo "Action requise : nettoyer + rotation cles"
  exit 1
else
  echo "AUDIT CLEAN - 0 secret detected"
  exit 0
fi
