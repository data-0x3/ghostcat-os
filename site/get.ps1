# GhostCat OS - Windows downloader - developed by 0x3 - https://t.me/data0x3
# Usage (PowerShell):  irm https://data-0x3.github.io/ghostcat-os/win.txt | iex
# Downloads the latest GhostCat OS ISO, joins the parts and verifies the SHA256.
# ASCII only on purpose: Windows PowerShell 5.1 can misread accents when piped through iex.

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Say($msg, $color = 'White') { Write-Host "  $msg" -ForegroundColor $color }

Write-Host ""
Write-Host "      /\_/\     GHOSTCAT OS" -ForegroundColor White
Write-Host "     ( o.o )    the true privacy" -ForegroundColor Gray
Write-Host "      \~~~/     developed by 0x3" -ForegroundColor DarkGray
Write-Host ""

$api = 'https://api.github.com/repos/data-0x3/ghostcat-os/releases/latest'
Say "Looking for the latest version..."
$rel = Invoke-RestMethod -Uri $api -Headers @{ 'User-Agent' = 'ghostcat-get' }
$assets = $rel.assets
$shaAsset = $assets | Where-Object { $_.name -like '*.iso.sha256' } | Select-Object -First 1
$parts = @($assets | Where-Object { $_.name -match '\.iso\.part\d+$' } | Sort-Object name)
if ($parts.Count -eq 0) { $parts = @($assets | Where-Object { $_.name -match '\.iso$' }) }
if ($parts.Count -eq 0 -or -not $shaAsset) { throw "No ISO found in release $($rel.tag_name)." }

$isoName = ($parts[0].name -replace '\.part\d+$', '')
$total = ($parts | Measure-Object -Property size -Sum).Sum
Say ("Version : {0}  ({1:N2} GB)" -f $rel.name, ($total / 1GB)) 'Cyan'

$dir = Join-Path $env:USERPROFILE 'Downloads'
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
$free = (Get-PSDrive -Name ($dir.Substring(0, 1))).Free
if ($free -lt (2.2 * $total)) {
  throw ("Not enough free space in {0}: {1:N1} GB needed, {2:N1} GB free." -f $dir, (2.2 * $total / 1GB), ($free / 1GB))
}
Set-Location $dir

$curl = Get-Command curl.exe -ErrorAction SilentlyContinue
$i = 0
foreach ($p in $parts) {
  $i++
  $dest = Join-Path $dir $p.name
  if ((Test-Path $dest) -and ((Get-Item $dest).Length -eq $p.size)) {
    Say "[$i/$($parts.Count)] $($p.name) already downloaded" 'DarkGray'; continue
  }
  Say "[$i/$($parts.Count)] Downloading $($p.name)..."
  if ($curl) {
    # a cut connection resumes where it stopped, up to 30 times
    for ($try = 1; $try -le 30; $try++) {
      & curl.exe -L --fail --retry 5 --retry-delay 3 -C - -o $dest $p.browser_download_url
      if ($LASTEXITCODE -eq 0) { break }
      if ((Test-Path $dest) -and ((Get-Item $dest).Length -eq $p.size)) { break }
      Say "Connection lost, resuming ($try/30)..." 'Yellow'
      Start-Sleep -Seconds 3
    }
    if ((Get-Item $dest -ErrorAction SilentlyContinue).Length -ne $p.size) { throw "Download failed: $($p.name). Run the command again to resume." }
  } else {
    Invoke-WebRequest -Uri $p.browser_download_url -OutFile $dest -UseBasicParsing
  }
  if ((Get-Item $dest).Length -ne $p.size) { throw "Incomplete file: $($p.name). Run the command again to resume." }
}

$iso = Join-Path $dir $isoName
if ($parts.Count -gt 1) {
  Say "Joining the parts into $isoName..."
  $out = [IO.File]::Create($iso)
  try {
    foreach ($p in $parts) {
      $in = [IO.File]::OpenRead((Join-Path $dir $p.name))
      try { $in.CopyTo($out, 8MB) } finally { $in.Dispose() }
    }
  } finally { $out.Dispose() }
}

Say "Checking the SHA256 fingerprint..."
$wc = New-Object Net.WebClient
$wc.Headers.Add('User-Agent', 'ghostcat-get')
$expected = ($wc.DownloadString($shaAsset.browser_download_url).Trim() -split '\s+')[0].ToLower()
$actual = (Get-FileHash -Algorithm SHA256 -Path $iso).Hash.ToLower()
if ($actual -ne $expected) {
  Say "Fingerprint mismatch! Expected $expected" 'Red'
  Say "                      got      $actual" 'Red'
  Remove-Item $iso -Force
  throw "Corrupted download. Delete the .part files in $dir and run the command again."
}
if ($parts.Count -gt 1) { $parts | ForEach-Object { Remove-Item (Join-Path $dir $_.name) -Force } }

Write-Host ""
Say "OK - GhostCat OS is ready:" 'Green'
Say $iso 'Green'
Say "SHA256 $actual" 'DarkGray'
Write-Host ""
Say "Next: open Rufus (https://rufus.ie), pick your USB key and this ISO,"
Say "partition scheme GPT, click START and choose 'Write in DD Image mode'."
Say "Full guide: https://data-0x3.github.io/ghostcat-os/#install"
Write-Host ""
