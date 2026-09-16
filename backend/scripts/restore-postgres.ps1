$ErrorActionPreference = 'Stop'

$backupFile = $args[0]
$targetUrl = if ($args.Count -ge 2 -and $args[1]) { $args[1] } else { $env:DATABASE_URL }

if (-not $backupFile -or -not (Test-Path $backupFile)) {
  Write-Error 'Usage: RESTORE_CONFIRM=yes ./restore-postgres.ps1 <backup-file> [target-database-url]'
  exit 1
}

if ($env:RESTORE_CONFIRM -ne 'yes') {
  Write-Error 'refusing to restore without RESTORE_CONFIRM=yes (this is destructive)'
  exit 1
}

if (-not $targetUrl) {
  Write-Error 'target DATABASE_URL not provided'
  exit 1
}

$pgRestore = Get-Command pg_restore -ErrorAction SilentlyContinue
if (-not $pgRestore) {
  Write-Error 'pg_restore not found in PATH. Install the PostgreSQL client tools.'
  exit 1
}

Write-Host "Restoring $backupFile into the target database"

& $pgRestore.Source --clean --if-exists --no-owner --no-privileges --dbname=$targetUrl $backupFile
if ($LASTEXITCODE -ne 0) {
  Write-Error 'pg_restore failed'
  exit 1
}

Write-Host 'Restore completed. Verify with the queries in docs/production-backup-recovery.md'
