#!/usr/bin/env bash
set -euo pipefail

BACKUP_FILE="${1:-}"
TARGET_URL="${2:-${DATABASE_URL:-}}"

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "Usage: RESTORE_CONFIRM=yes $0 <backup-file> [target-database-url]" >&2
  exit 1
fi

if [ "${RESTORE_CONFIRM:-}" != "yes" ]; then
  echo "ERROR: refusing to restore without RESTORE_CONFIRM=yes (this is destructive)." >&2
  exit 1
fi

if [ -z "$TARGET_URL" ]; then
  echo "ERROR: target DATABASE_URL not provided" >&2
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "ERROR: pg_restore not found in PATH. Install the PostgreSQL client tools (postgresql-client)." >&2
  exit 1
fi

echo "Restoring ${BACKUP_FILE} into the target database"

if ! pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$TARGET_URL" "$BACKUP_FILE"; then
  echo "ERROR: pg_restore failed" >&2
  exit 1
fi

echo "Restore completed. Verify with the queries in docs/production-backup-recovery.md"
