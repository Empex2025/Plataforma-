$ErrorActionPreference = 'Stop'

if (-not $env:DATABASE_URL) {
  Write-Error 'DATABASE_URL is not set'
  exit 1
}

$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) {
  Write-Error 'pg_dump not found in PATH. Install the PostgreSQL client tools.'
  exit 1
}

$outputDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { Join-Path (Get-Location) 'backups\postgres' }
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$dbName = 'database'
try {
  $uri = [System.Uri]$env:DATABASE_URL
  $candidate = $uri.AbsolutePath.Trim('/').Split('/')[-1]
  if ($candidate) { $dbName = $candidate }
} catch { }

$timestamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$file = Join-Path $outputDir "$($dbName)_$($timestamp).dump"

Write-Host "Backing up database '$dbName' to $file"

& $pgDump.Source --format=custom --no-owner --no-privileges --file=$file $env:DATABASE_URL
if ($LASTEXITCODE -ne 0) {
  if (Test-Path $file) { Remove-Item $file -Force }
  Write-Error 'pg_dump failed'
  exit 1
}

if (-not (Test-Path $file) -or (Get-Item $file).Length -eq 0) {
  if (Test-Path $file) { Remove-Item $file -Force }
  Write-Error 'backup file is empty'
  exit 1
}

Write-Host "Backup completed: $file"
