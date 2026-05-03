#!/bin/bash
# patch-existing-directors-with-maestro-block.sh
# SOP V26 — Migration progressive des directeurs vers Maestro Auto-Wiring (Option A append-only)
#
# Logic:
#   - For each agent in /app/silver-oak-os/agents/<id>/
#   - SKIP: maestro (PROTECTED), main (Alex orchestrator), _archive, _template, FACTORY_AGENTS_PLAN.md
#   - SKIP if CLAUDE.md already contains "Délégation à Maestro" (idempotent)
#   - BACKUP: <agent>/CLAUDE.md.bak.before-maestro-block-<timestamp>
#   - APPEND: trilingual Maestro block at end of CLAUDE.md
#   - LOG: each action

set -e

AGENTS_DIR="/app/silver-oak-os/agents"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SKIP_AGENTS=("maestro" "main" "_archive" "_template")
INJECTED=0
SKIPPED_PROTECTED=0
SKIPPED_ALREADY_HAS=0
ERRORS=0

# Trilingual block to append (matches MAESTRO_AUTO_DELEGATION_BLOCK in agent_factory_v2.ts)
read -r -d '' MAESTRO_BLOCK <<'BLOCKEOF' || true

---

## 🛠️ Délégation à Maestro (auto-wired par Agent Factory v2 — patché 2026-05-03)

### FR
Pour toutes les tâches techniques (code, deploy, debug, audit, infra, refactor, tests, security review),
tu peux déléguer DIRECTEMENT à Maestro sans passer par Alex.
Maestro est le CTO de Silver Oak OS et orchestre lui-même les workers techniques.

Comment déléguer : utilise `@maestro: <ta demande>` ou appelle `delegateToAgent('maestro', <prompt>)`.

### EN
For any technical task (code, deploy, debug, audit, infra, refactor, tests, security review),
you can delegate DIRECTLY to Maestro without going through Alex.
Maestro is the CTO of Silver Oak OS and orchestrates the technical workers himself.

How to delegate: use `@maestro: <your request>` or call `delegateToAgent('maestro', <prompt>)`.

### ES
Para cualquier tarea técnica (código, despliegue, debug, auditoría, infra, refactor, tests, revisión de seguridad),
puedes delegar DIRECTAMENTE a Maestro sin pasar por Alex.
Maestro es el CTO de Silver Oak OS y orquesta él mismo los workers técnicos.

Cómo delegar: usa `@maestro: <tu solicitud>` o llama a `delegateToAgent('maestro', <prompt>)`.

---
BLOCKEOF

echo "=== Patch existing directors with Maestro auto-delegation block ==="
echo "AGENTS_DIR: $AGENTS_DIR"
echo "TIMESTAMP: $TIMESTAMP"
echo ""

for agent_path in "$AGENTS_DIR"/*/; do
    agent_id=$(basename "$agent_path")

    # Skip non-agent dirs
    skip=false
    for sk in "${SKIP_AGENTS[@]}"; do
        if [ "$agent_id" = "$sk" ]; then
            skip=true
            break
        fi
    done
    if [ "$skip" = true ]; then
        echo "⏭️  SKIP $agent_id (protected/system)"
        SKIPPED_PROTECTED=$((SKIPPED_PROTECTED + 1))
        continue
    fi

    claude_md="$agent_path/CLAUDE.md"

    if [ ! -f "$claude_md" ]; then
        echo "⚠️  $agent_id: no CLAUDE.md found, skipping"
        ERRORS=$((ERRORS + 1))
        continue
    fi

    # Idempotency check
    if grep -q "Délégation à Maestro" "$claude_md"; then
        echo "✅ $agent_id: already has Maestro block, skipping (idempotent)"
        SKIPPED_ALREADY_HAS=$((SKIPPED_ALREADY_HAS + 1))
        continue
    fi

    # Backup
    backup="$claude_md.bak.before-maestro-block-$TIMESTAMP"
    cp "$claude_md" "$backup"

    # Append block
    echo "$MAESTRO_BLOCK" >> "$claude_md"

    # Verify it was added
    if grep -q "Délégation à Maestro" "$claude_md"; then
        new_lines=$(wc -l < "$claude_md")
        echo "✏️  $agent_id: INJECTED (now $new_lines lines, backup: $(basename $backup))"
        INJECTED=$((INJECTED + 1))
    else
        echo "❌ $agent_id: append failed, restoring backup"
        cp "$backup" "$claude_md"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""
echo "=== SUMMARY ==="
echo "Injected:        $INJECTED"
echo "Already had it:  $SKIPPED_ALREADY_HAS"
echo "Protected/sys:   $SKIPPED_PROTECTED"
echo "Errors:          $ERRORS"
echo ""
echo "Total agents reviewed: $((INJECTED + SKIPPED_ALREADY_HAS + SKIPPED_PROTECTED + ERRORS))"

if [ $ERRORS -gt 0 ]; then
    exit 1
fi
exit 0
