# Backs up everything this project needs that is NOT on GitHub, into one zip,
# so the work can continue on another laptop (restore: scripts/restore-laptop.ps1).
#
#   powershell -ExecutionPolicy Bypass -File scripts\backup-laptop.ps1
#   ... -Destination "G:\My Drive\VocalisAI-backup"   (default: Google Drive if found, else Desktop)
#   ... -IncludeUploads                                (also local test recordings in uploads/)
#   ... -Schedule                                      (also run it every day at 6 pm)
#
# The zip holds secrets (.env files): keep it only in your own Google Drive or
# another private place, never in the repository or a shared folder.
param(
  [string]$Destination = "",
  [switch]$IncludeUploads,
  [switch]$Schedule,
  [int]$Keep = 7
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

# The Claude memory folder is named after the project path, e.g. D:\New folder -> D--New-folder.
$projectKey = ($root -replace '[:\\/ ]', '-')
$memory = Join-Path $env:USERPROFILE ".claude\projects\$projectKey\memory"

if (-not $Destination) {
  $drive = Get-PSDrive -PSProvider FileSystem | ForEach-Object { Join-Path $_.Root "My Drive" } | Where-Object { Test-Path $_ } | Select-Object -First 1
  $Destination = if ($drive) { Join-Path $drive "VocalisAI-backup" } else { Join-Path ([Environment]::GetFolderPath("Desktop")) "VocalisAI-backup" }
}
New-Item -ItemType Directory -Force $Destination | Out-Null

# 1. Code: warn if anything is not on GitHub yet.
Push-Location $root
try {
  git fetch -q 2>$null
  $dirty = git status --porcelain
  $unpushed = git log --oneline --branches --not --remotes
  if ($dirty) { Write-Host "WARNING: some changes are not committed yet (they are not on GitHub):" -ForegroundColor Yellow; $dirty | Select-Object -First 10 | ForEach-Object { Write-Host "  $_" } }
  if ($unpushed) { Write-Host "WARNING: some commits are not pushed to GitHub yet:" -ForegroundColor Yellow; $unpushed | Select-Object -First 10 | ForEach-Object { Write-Host "  $_" } }
} finally { Pop-Location }

# 2. Files that are not on GitHub (on purpose).
$stage = Join-Path $env:TEMP ("vocalisai-backup-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory $stage | Out-Null
$items = @(".env", ".env.test", ".env.staging", ".neon", ".vercel\project.json", "private")
if ($IncludeUploads) { $items += "uploads" }
$copied = @()
foreach ($item in $items) {
  $src = Join-Path $root $item
  if (-not (Test-Path $src)) { continue }
  $dst = Join-Path $stage "project\$item"
  New-Item -ItemType Directory -Force (Split-Path -Parent $dst) | Out-Null
  Copy-Item $src $dst -Recurse -Force
  $copied += $item
}
if (Test-Path $memory) {
  Copy-Item $memory (Join-Path $stage "claude-memory") -Recurse -Force
  $copied += "Claude memory"
}
@{ createdAt = (Get-Date).ToString("s"); projectPath = $root; items = $copied } | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $stage "backup-info.json")

$zip = Join-Path $Destination ("vocalisai-backup-" + (Get-Date -Format "yyyy-MM-dd_HHmm") + ".zip")
Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $zip -Force
Remove-Item $stage -Recurse -Force

# 3. Keep only the newest backups.
Get-ChildItem $Destination -Filter "vocalisai-backup-*.zip" | Sort-Object Name -Descending | Select-Object -Skip $Keep | Remove-Item -Force

Write-Host ("Backup saved: {0} ({1:N1} MB)" -f $zip, ((Get-Item $zip).Length / 1MB)) -ForegroundColor Green
Write-Host ("Included: " + ($copied -join ", "))
if ($Destination -notmatch "My Drive") { Write-Host "Google Drive for desktop was not found: upload this zip to your Google Drive yourself." -ForegroundColor Yellow }

if ($Schedule) {
  $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Destination `"$Destination`""
  $trigger = New-ScheduledTaskTrigger -Daily -At 6pm
  Register-ScheduledTask -TaskName "VocalisAI daily backup" -Action $action -Trigger $trigger -Description "Backs up VocalisAI's private files to $Destination" -Force | Out-Null
  Write-Host "Daily backup scheduled for 6 pm (Task Scheduler: 'VocalisAI daily backup')." -ForegroundColor Green
}
