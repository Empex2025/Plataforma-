#!/usr/bin/env bash
set -euo pipefail

if [ -z "${S3_ENDPOINT:-}" ] || [ -z "${S3_BUCKET:-}" ]; then
  echo "ERROR: S3_ENDPOINT and S3_BUCKET are required" >&2
  exit 1
fi

OUTPUT_DIR="${STORAGE_BACKUP_DIR:-./backups/storage}/${S3_BUCKET}"
mkdir -p "$OUTPUT_DIR"

if command -v mc >/dev/null 2>&1; then
  ALIAS="backup-${RANDOM}"
  mc alias set "$ALIAS" "$S3_ENDPOINT" "${S3_ACCESS_KEY:-}" "${S3_SECRET_KEY:-}" >/dev/null
  mc mirror --overwrite "$ALIAS/$S3_BUCKET" "$OUTPUT_DIR"
  mc alias remove "$ALIAS" >/dev/null || true
  echo "Storage backup completed via mc: ${OUTPUT_DIR}"
  exit 0
fi

if command -v aws >/dev/null 2>&1; then
  AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY:-}" \
  AWS_SECRET_ACCESS_KEY="${S3_SECRET_KEY:-}" \
    aws --endpoint-url "$S3_ENDPOINT" s3 sync "s3://${S3_BUCKET}" "$OUTPUT_DIR"
  echo "Storage backup completed via aws cli: ${OUTPUT_DIR}"
  exit 0
fi

echo "ERROR: neither 'mc' (MinIO client) nor 'aws' (S3-compatible CLI) found in PATH" >&2
exit 1
