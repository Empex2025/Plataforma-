#!/usr/bin/env bash
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set" >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "ERROR: pg_dump not found in PATH. Install the PostgreSQL client tools (postgresql-client)." >&2
  exit 1
fi

OUTPUT_DIR="${BACKUP_DIR:-./backups/postgres}"
mkdir -p "$OUTPUT_DIR"

DB_NAME="$(node -e "try{const u=new URL(process.env.DATABASE_URL);const p=u.pathname.split('/').filter(Boolean).pop();console.log(p||'database')}catch(e){console.log('database')}" 2>/dev/null || echo database)"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$OUTPUT_DIR/${DB_NAME}_${TIMESTAMP}.dump"

echo "Backing up database '${DB_NAME}' to ${FILE}"

if ! pg_dump --format=custom --no-owner --no-privileges --file="$FILE" "$DATABASE_URL"; then
  echo "ERROR: pg_dump failed" >&2
  rm -f "$FILE"
  exit 1
fi

if [ ! -s "$FILE" ]; then
  echo "ERROR: backup file is empty" >&2
  rm -f "$FILE"
  exit 1
fi

echo "Backup completed: ${FILE}"
