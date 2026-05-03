#!/bin/bash
# sync-agents-sqlite.sh
# SOP V26 — Sync /agents/<id>/ ↔ SQLite registry agents table
#
# Logic:
#   - For each agent in /agents/<id>/ with agent.yaml:
#   - Skip _archive, _template
#   - Read skills from filesystem (ls /agents/<id>/skills/)
#   - Read skills from agent.yaml if listed there
#   - Read description from agent.yaml
#   - INSERT OR UPDATE in SQLite agents table
#   - Status = 'active' for all directors
#
# Idempotent: can be re-run safely.

set -e

DB="/app/silver-oak-os/store/claudeclaw.db"
AGENTS_DIR="/app/silver-oak-os/agents"
SYNCED=0
SKIPPED=0

echo "=== Sync agents/ ↔ SQLite registry ==="

for agent_path in "$AGENTS_DIR"/*/; do
    agent_id=$(basename "$agent_path")
    if [ "$agent_id" = "_archive" ] || [ "$agent_id" = "_template" ]; then
        echo "⏭️  SKIP $agent_id (system)"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi
    
    yaml="$agent_path/agent.yaml"
    if [ ! -f "$yaml" ]; then
        echo "⚠️  $agent_id: no agent.yaml, skipping"
        continue
    fi
    
    name=$(grep "^name:" "$yaml" | head -1 | sed 's/name:[[:space:]]*//' | tr -d '\r')
    description=$(grep "^description:" "$yaml" | head -1 | sed 's/description:[[:space:]]*//' | tr -d '\r' | sed 's/"/'"'"'/g')
    
    # Skills from filesystem
    if [ -d "$agent_path/skills" ]; then
        skills_fs=$(ls "$agent_path/skills/" 2>/dev/null | tr '\n' ',' | sed 's/,$//')
    else
        skills_fs=""
    fi
    
    # Build JSON skills array from filesystem
    if [ -z "$skills_fs" ]; then
        skills_json="[]"
    else
        skills_json="[\"$(echo $skills_fs | sed 's/,/","/g')\"]"
    fi
    
    # Determine role
    if [ "$agent_id" = "main" ]; then
        role="orchestrator"
    elif [ "$agent_id" = "maestro" ]; then
        role="specialist"
    else
        role="specialist"
    fi
    
    # UPSERT
    sqlite3 "$DB" "INSERT INTO agents (id, name, description, role, skills, status) VALUES ('$agent_id', '$name', '$description', '$role', '$skills_json', 'active') ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description, skills = excluded.skills, status = 'active' WHERE agents.skills = '[]' OR length(agents.skills) <= 2;" 2>/dev/null
    
    skills_count=$(echo $skills_fs | tr ',' '\n' | grep -c . || echo 0)
    echo "✅ $agent_id ($name): synced ($skills_count skills)"
    SYNCED=$((SYNCED + 1))
done

echo ""
echo "=== SUMMARY ==="
echo "Synced: $SYNCED"
echo "Skipped: $SKIPPED"
echo ""
echo "=== État final SQLite ==="
sqlite3 "$DB" "SELECT id, name, status, skills FROM agents ORDER BY id;"
