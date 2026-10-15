# Restores a backup made by scripts/backup-laptop.ps1 into a fresh clone of the
# repository on a new laptop, then installs the project's packages.
#
#   powershell -ExecutionPolicy Bypass -File scripts\restore-laptop.ps1 -Zip "G:\My Drive\VocalisAI-backup\vocalisai-backup-....zip"
#
# Existing files are never overwritten unless -Force is given.
param(
  [Parameter(Mandatory = $true)][string]$Zip,
  [switch]$Force,
  [switch]$SkipInstall
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path $Zip)) { throw "Backup not found: $Zip" }

$tmp = Join-Path $env:TEMP ("vocalisai-restore-" + [guid]::NewGuid().ToString("N"))
Expand-Archive -Path $Zip -DestinationPath $tmp

# Walks the tree keeping the relative path itself (Windows short names such as
# LAKSHA~1 make cutting full paths unreliable).
function Restore-Tree($from, $to, $rel = "") {
  if (-not (Test-Path -LiteralPath $from)) { return }
  Get-ChildItem -LiteralPath $from -Force | ForEach-Object {
    $r = if ($rel) { "$rel\$($_.Name)" } else { $_.Name }
    if ($_.PSIsContainer) { Restore-Tree $_.FullName $to $r; return }
    $dst = Join-Path $to $r
    if ((Test-Path -LiteralPath $dst) -and -not $Force) { Write-Host "  kept existing $dst" -ForegroundColor Yellow; return }
    New-Item -ItemType Directory -Force (Split-Path -Parent $dst) | Out-Null
    Copy-Item -LiteralPath $_.FullName $dst -Force
  }
}

Write-Host "Restoring project files (.env files, private/, Neon and Vercel links)..."
Restore-Tree (Join-Path $tmp "project") $root

# Claude's memory follows the new project path, e.g. C:\Work\vocalisai -> C--Work-vocalisai.
$projectKey = ($root -replace '[:\\/ ]', '-')
$memory = Join-Path $env:USERPROFILE ".claude\projects\$projectKey\memory"
Write-Host "Restoring Claude memory to $memory ..."
Restore-Tree (Join-Path $tmp "claude-memory") $memory
Remove-Item $tmp -Recurse -Force

if (-not $SkipInstall) {
  Push-Location $root
  try {
    Write-Host "Installing packages (a few minutes)..."
    npm.cmd ci
    npx.cmd prisma generate
    npx.cmd playwright install chromium
  } finally { Pop-Location }
}
Write-Host "Done. Next: npm.cmd run dev, then open http://localhost:3000" -ForegroundColor Green
