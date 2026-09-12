# AutoSideload.ps1 - tu dong hoa viec sideload RapPhim len iPhone (Windows).
#
# Lam gi:
#   1. Tai ban .ipa MOI NHAT tu GitHub Release ve mot thu muc.
#   2. Mo cong cu sideload (AltStore/AltServer hoac Sideloadly) voi file do.
#   3. (Tuy chon) Tao Scheduled Task giu AltServer chay nen -> app TU GIA HAN
#      truoc khi het han 7 ngay, khong phai ky tay lai.
#
# RANH GIOI: script KHONG dung/luu mat khau Apple ID cua ban. Viec ky app do
# AltStore/Sideloadly tu xu ly trong giao dien bao mat cua no - ban nhap Apple ID
# mien phi mot lan o do. Day la co che phat trien ca nhan chinh thuc cua Apple.
#
# Dung:
#   powershell -ExecutionPolicy Bypass -File AutoSideload.ps1
#   powershell -ExecutionPolicy Bypass -File AutoSideload.ps1 -SetupAutoRefresh

param(
  [string]$Repo = "nguyenquocanhz/RapPhimWareHouse",
  [string]$OutDir = "$env:USERPROFILE\RapPhim",
  [switch]$SetupAutoRefresh
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

# --- 1. Tai .ipa moi nhat tu GitHub Release ---------------------------------
Write-Host "==> Lay ban .ipa moi nhat tu GitHub Release ($Repo)" -ForegroundColor Cyan
$headers = @{ "User-Agent" = "AutoSideload"; "Accept" = "application/vnd.github+json" }
$rel = Invoke-RestMethod "https://api.github.com/repos/$Repo/releases/latest" -Headers $headers
$asset = $rel.assets | Where-Object { $_.name -like "*.ipa" } | Select-Object -First 1
if (-not $asset) { throw "Khong tim thay file .ipa trong release $($rel.tag_name)." }

$ipa = Join-Path $OutDir $asset.name
$mb = [math]::Round($asset.size / 1MB, 1)
Write-Host "    $($asset.name)  ($mb MB) - phien ban $($rel.tag_name)"
Invoke-WebRequest $asset.browser_download_url -OutFile $ipa -Headers $headers
Write-Host "    Da tai: $ipa" -ForegroundColor Green

# --- 2. Tim cong cu sideload da cai -----------------------------------------
$altServer = @(
  "$env:ProgramFiles\AltServer\AltServer.exe",
  "${env:ProgramFiles(x86)}\AltServer\AltServer.exe",
  "$env:LOCALAPPDATA\Programs\AltServer\AltServer.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

$sideloadly = @(
  "$env:ProgramFiles\Sideloadly\sideloadly.exe",
  "$env:LOCALAPPDATA\Programs\sideloadly\sideloadly.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

# --- 3. (Tuy chon) Giu AltServer chay nen de tu gia han ---------------------
if ($SetupAutoRefresh) {
  if (-not $altServer) {
    Write-Warning "Chua cai AltServer. Tai AltStore o https://altstore.io de co auto-refresh nen."
  } else {
    $action = New-ScheduledTaskAction -Execute $altServer
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    Register-ScheduledTask -TaskName "RapPhim-AltServer" -Action $action -Trigger $trigger `
      -Settings $settings -Force | Out-Null
    Write-Host "==> Da tao Scheduled Task 'RapPhim-AltServer': AltServer tu chay luc dang nhap." -ForegroundColor Green
    Write-Host "    App se tu ky lai truoc khi het han 7 ngay (may bat + iPhone cung WiFi)."
  }
}

# --- 4. Mo cong cu de cai/gia han -------------------------------------------
Write-Host ""
if ($altServer) {
  Write-Host "==> AltStore da cai. Cach cai:" -ForegroundColor Cyan
  Write-Host "    - Mo AltStore tren PC (bieu tuong khay he thong) -> tab 'My Apps' -> dau '+'"
  Write-Host "    - Chon file: $ipa"
  Write-Host "    - Nhap Apple ID MIEN PHI (AltStore tu luu an toan, khong qua script nay)."
  Start-Process $altServer
} elseif ($sideloadly) {
  Write-Host "==> Mo Sideloadly. Keo file .ipa vao, nhap Apple ID roi bam Start:" -ForegroundColor Cyan
  Write-Host "    $ipa"
  Start-Process $sideloadly
} else {
  Write-Host "==> Chua cai cong cu sideload. Cai MOT trong hai (deu mien phi):" -ForegroundColor Yellow
  Write-Host "    - AltStore (khuyen dung, tu gia han nen):  https://altstore.io"
  Write-Host "    - Sideloadly:                              https://sideloadly.io"
  Write-Host "    Sau do keo file nay vao cong cu:  $ipa"
  Write-Host "    (Ca hai deu can iTunes + iCloud ban tu apple.com de co driver USB.)"
}

Write-Host ""
Write-Host "Xong. Tren iPhone: Cai dat > Chung > VPN & Quan ly thiet bi > tin cay Apple ID." -ForegroundColor Green
