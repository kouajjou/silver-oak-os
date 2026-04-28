#!/usr/bin/env bash
# SOP V26.3 — Audit staged files for secrets before commit
# Exits 1 if secrets found, 0 if clean.

PATTERNS=(
  "ANTHROPIC_API_KEY=[A-Za-z0-9_-]{20,}"
  "sk-ant-[A-Za-z0-9_-]{20,}"
  "sk-[A-Za-z0-9]{48}"
  "AIza[A-Za-z0-9_-]{35}"
  "password\s*=\s*['\"][^'\"]{8,}"
)

STAGED=$(git diff --cached --name-only --diff-filter=ACMR | grep -E "\.(ts|js|py|sh|json|yml|yaml|env)$" 2>/dev/null)

if [ -z "$STAGED" ]; then
  exit 0
fi

FOUND=0
for file in $STAGED; do
  if [ ! -f "$file" ]; then continue; fi
  for pattern in "${PATTERNS[@]}"; do
    if grep -qP "$pattern" "$file" 2>/dev/null; then
      echo "⚠️  Possible secret in $file (pattern: $pattern)"
      FOUND=1
    fi
  done
done

if [ $FOUND -eq 1 ]; then
  echo "❌ Pre-commit: secrets detected. Fix before committing."
  exit 1
fi

exit 0
