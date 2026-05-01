#!/bin/bash
# Silver Oak OS — Nightly SQLite backup with 7-day rotation
#
# Usage:
#   bash scripts/backup-sqlite.sh
#
# What it does:
#   1. Snapshots all data/*.db files (uses sqlite3 .backup for consistency)
#   2. Tars them with timestamp into /var/backups/silveroak/
#   3. Removes archives older than 7 days
#
# Cron suggestion (run as claudeclaw):
#   3 3 * * *  /app/silver-oak-os/scripts/backup-sqlite.sh >> /var/log/silveroak-backup.log 2>&1
#
# To add Supabase upload later: see docs/backup-supabase.md (TODO)

set -euo pipefail

REPO=/app/silver-oak-os
DATA_DIR="$REPO/data"
BACKUP_DIR=/var/backups/silveroak
RETENTION_DAYS=7
TS=$(date +%Y%m%d_%H%M%S)
TMP_DIR=$(mktemp -d -t silveroak-backup-XXXX)

trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting Silver Oak OS SQLite backup"
echo "  data dir:    $DATA_DIR"
echo "  backup dir:  $BACKUP_DIR"
echo "  timestamp:   $TS"

# 1. Snapshot each .db using sqlite3 .backup (safe for live DBs)
db_count=0
for db in "$DATA_DIR"/*.db; do
  [ -f "$db" ] || continue
  name=$(basename "$db")
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$db" ".backup '$TMP_DIR/$name'"
  else
    # Fallback: plain copy (less safe but works if no sqlite3 cli)
    cp -p "$db" "$TMP_DIR/$name"
  fi
  db_count=$((db_count + 1))
done

if [ "$db_count" -eq 0 ]; then
  echo "  WARNING: no .db files found in $DATA_DIR"
  exit 0
fi

echo "  snapshotted: $db_count databases"

# 2. Tar with gzip
ARCHIVE="$BACKUP_DIR/silveroak-${TS}.tar.gz"
tar -czf "$ARCHIVE" -C "$TMP_DIR" .
SIZE=$(du -h "$ARCHIVE" | cut -f1)
echo "  archive:     $ARCHIVE ($SIZE)"

# 3. Rotation — remove archives older than RETENTION_DAYS
DELETED=$(find "$BACKUP_DIR" -name 'silveroak-*.tar.gz' -mtime +"$RETENTION_DAYS" -print -delete | wc -l)
echo "  rotation:    removed $DELETED old archives (>$RETENTION_DAYS days)"

# 4. Final inventory
TOTAL=$(ls -1 "$BACKUP_DIR"/silveroak-*.tar.gz 2>/dev/null | wc -l)
echo "  inventory:   $TOTAL archives in $BACKUP_DIR"
echo "[$(date)] Backup complete."
