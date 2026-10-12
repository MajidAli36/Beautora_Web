# Developer script: build a customer-ready folder with ONLY Install + Uninstall.
# Customers do NOT need .NET SDK, Visual Studio, or source code.
#
# Output:
#   dist\SyncOps-DeviceAgent\
#     Install.bat
#     Uninstall.bat
#     (hidden) app\   ← pre-built agent binaries
#
# Then zip dist\SyncOps-DeviceAgent and give that zip to the salon.

param(
  [string]$OutRoot = "$PSScriptRoot\..\dist\SyncOps-DeviceAgent",
  [string]$AppUrl = "https://www.beautora.app",
  [string]$ZktecoHost = "192.168.1.201",
  [int]$ZktecoPort = 4370
)

$ErrorActionPreference = "Stop"
$project = Join-Path $PSScriptRoot "..\src\Beautora.DeviceAgent\Beautora.DeviceAgent.csproj"
$publishDir = Join-Path $PSScriptRoot "..\publish\customer-agent"
$cloudUrl = $AppUrl.Trim().TrimEnd("/")

Write-Host "=== Building customer package (self-contained, no .NET SDK on salon PC) ===" -ForegroundColor Cyan

Get-Process -Name "Beautora.DeviceAgent" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

if (Test-Path $publishDir) { Remove-Item $publishDir -Recurse -Force }
New-Item -ItemType Directory -Path $publishDir -Force | Out-Null

Write-Host "Publishing self-contained win-x64..."
$env:ASPNETCORE_ENVIRONMENT = "Production"
& dotnet publish $project `
  -c Release `
  -o $publishDir `
  -r win-x64 `
  --self-contained true `
  /p:PublishSingleFile=true `
  /p:IncludeNativeLibrariesForSelfExtract=true `
  /p:EnableCompressionInSingleFile=true `
  /p:PublishReadyToRun=true `
  /p:EnvironmentName=Production

if ($LASTEXITCODE -ne 0) { throw "dotnet publish failed" }
if (-not (Test-Path (Join-Path $publishDir "Beautora.DeviceAgent.exe"))) {
  throw "Beautora.DeviceAgent.exe missing after publish"
}

# Lean cloud settings baked into the package
function Set-LeanJson([string]$path) {
  if (-not (Test-Path $path)) { return }
  $json = Get-Content $path -Raw | ConvertFrom-Json
  if (-not $json.DeviceAgent) {
    $json | Add-Member -NotePropertyName DeviceAgent -NotePropertyValue ([pscustomobject]@{}) -Force
  }
  $da = $json.DeviceAgent
  $da | Add-Member -NotePropertyName MockMode -NotePropertyValue $false -Force
  $da | Add-Member -NotePropertyName EnableTray -NotePropertyValue $false -Force
  $da | Add-Member -NotePropertyName LeanMode -NotePropertyValue $true -Force
  $da | Add-Member -NotePropertyName DiscoveryIntervalMinutes -NotePropertyValue 15 -Force
  $da | Add-Member -NotePropertyName Host -NotePropertyValue "0.0.0.0" -Force
  $da | Add-Member -NotePropertyName Port -NotePropertyValue 17890 -Force
  if (-not $da.Beautora) { $da | Add-Member -NotePropertyName Beautora -NotePropertyValue ([pscustomobject]@{}) -Force }
  $da.Beautora | Add-Member -NotePropertyName AppUrl -NotePropertyValue $cloudUrl -Force
  $da.Beautora | Add-Member -NotePropertyName AttendanceSyncEnabled -NotePropertyValue $true -Force
  $da.Beautora | Add-Member -NotePropertyName AttendanceSyncIntervalSeconds -NotePropertyValue 30 -Force
  if (-not $da.Zkteco) { $da | Add-Member -NotePropertyName Zkteco -NotePropertyValue ([pscustomobject]@{}) -Force }
  $da.Zkteco | Add-Member -NotePropertyName Enabled -NotePropertyValue $true -Force
  $da.Zkteco | Add-Member -NotePropertyName ProtocolMode -NotePropertyValue "push-buffer" -Force
  $da.Zkteco | Add-Member -NotePropertyName EnableTcpWatcher -NotePropertyValue $false -Force
  $da.Zkteco | Add-Member -NotePropertyName Host -NotePropertyValue $ZktecoHost -Force
  $da.Zkteco | Add-Member -NotePropertyName Port -NotePropertyValue $ZktecoPort -Force
  if (-not $json.SyncOpsCloud) { $json | Add-Member -NotePropertyName SyncOpsCloud -NotePropertyValue ([pscustomobject]@{}) -Force }
  $json.SyncOpsCloud | Add-Member -NotePropertyName BaseUrl -NotePropertyValue $cloudUrl -Force
  $json | ConvertTo-Json -Depth 10 | Set-Content $path -Encoding UTF8
}

Set-LeanJson (Join-Path $publishDir "appsettings.json")
Set-LeanJson (Join-Path $publishDir "appsettings.Production.json")

# Fresh customer folder — only Install + Uninstall visible
$appDir = Join-Path $OutRoot "app"
if (Test-Path $OutRoot) {
  # Folder may be open in Explorer from a previous Install — clear contents instead of failing.
  Get-ChildItem -Path $OutRoot -Force -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
  }
  if (-not (Test-Path $OutRoot)) {
    New-Item -ItemType Directory -Path $OutRoot -Force | Out-Null
  }
} else {
  New-Item -ItemType Directory -Path $OutRoot -Force | Out-Null
}
if (Test-Path $appDir) { Remove-Item $appDir -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Path $appDir -Force | Out-Null
Copy-Item -Path (Join-Path $publishDir "*") -Destination $appDir -Recurse -Force

# Customer-facing scripts (English, simple)
$installBat = @'
@echo off
title SyncOps Device Agent - Install
cd /d "%~dp0"

net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Please allow Administrator permission...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo.
echo Installing SyncOps Device Agent...
echo This runs in the background every time Windows starts.
echo Cloud: https://www.beautora.app
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0app\_install.ps1"
if errorlevel 1 (
  echo.
  echo Install failed.
  pause
  exit /b 1
)

echo.
echo Install complete.
echo Agent is running and will start automatically when Windows opens.
pause
'@

$uninstallBat = @'
@echo off
title SyncOps Device Agent - Uninstall
cd /d "%~dp0"

net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Please allow Administrator permission...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo.
echo Uninstalling SyncOps Device Agent...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0app\_uninstall.ps1"
if errorlevel 1 (
  echo.
  echo Uninstall failed.
  pause
  exit /b 1
)

echo.
echo Uninstall complete.
pause
'@

Set-Content -Path (Join-Path $OutRoot "Install.bat") -Value $installBat -Encoding ASCII
Set-Content -Path (Join-Path $OutRoot "Uninstall.bat") -Value $uninstallBat -Encoding ASCII

# Internal scripts live under app\ (hidden folder)
$internalInstall = @'
$ErrorActionPreference = "Stop"
$ServiceName = "SyncOpsDeviceAgent"
$DisplayName = "SyncOps Device Agent"
$InstallDir = Join-Path $env:ProgramFiles "SyncOps\DeviceAgent"
$SourceDir = $PSScriptRoot
$CloudUrl = "https://www.beautora.app"
$Port = 17890

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]$identity
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Administrator required."
}

foreach ($name in @("BeautoraDeviceAgent", $ServiceName)) {
  $svc = Get-Service -Name $name -ErrorAction SilentlyContinue
  if ($svc) {
    Stop-Service $name -Force -ErrorAction SilentlyContinue
    sc.exe delete $name | Out-Null
    Start-Sleep -Seconds 2
  }
}
Get-Process -Name "Beautora.DeviceAgent" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

if (-not (Test-Path (Join-Path $SourceDir "Beautora.DeviceAgent.exe"))) {
  throw "Agent files missing next to installer. Re-download the package."
}

Write-Host "Copying files to $InstallDir ..."
if (Test-Path $InstallDir) { Remove-Item $InstallDir -Recurse -Force }
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
Copy-Item -Path (Join-Path $SourceDir "*") -Destination $InstallDir -Recurse -Force -Exclude "_install.ps1","_uninstall.ps1"

$exe = Join-Path $InstallDir "Beautora.DeviceAgent.exe"
if (-not (Test-Path $exe)) { throw "Install copy failed." }

[Environment]::SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Production", "Machine")
[Environment]::SetEnvironmentVariable("BEAUTORA_APP_URL", $CloudUrl, "Machine")

Write-Host "Creating Windows service..."
New-Service -Name $ServiceName -BinaryPathName "`"$exe`"" -DisplayName $DisplayName `
  -Description "SyncOps local device bridge. Syncs attendance to $CloudUrl." `
  -StartupType Automatic | Out-Null

sc.exe config $ServiceName start= delayed-auto | Out-Null
sc.exe failure $ServiceName reset= 86400 actions= restart/10000/restart/30000/restart/60000 | Out-Null
sc.exe failureflag $ServiceName 1 | Out-Null

# Firewall for ZK ADMS
$ruleName = "SyncOps Device Agent ADMS"
netsh advfirewall firewall delete rule name="$ruleName" | Out-Null
netsh advfirewall firewall add rule name="$ruleName" dir=in action=allow protocol=TCP localport=$Port profile=any | Out-Null

# Free port if a stray agent is still listening
try {
  $owners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($procId in $owners) {
    if ($procId -and $procId -ne 0) {
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
  }
} catch { }

Write-Host "Starting service..."
$started = $false
for ($i = 1; $i -le 3; $i++) {
  try {
    Start-Service $ServiceName -ErrorAction Stop
    Start-Sleep -Seconds 2
    $svc = Get-Service $ServiceName
    if ($svc.Status -eq "Running") { $started = $true; break }
  } catch {
    Write-Host "Start attempt $i failed: $($_.Exception.Message)" -ForegroundColor Yellow
    Start-Sleep -Seconds 3
  }
}
$svc = Get-Service $ServiceName
if (-not $started -or $svc.Status -ne "Running") {
  Write-Host ""
  Write-Host "Service failed to start. Recent .NET errors:" -ForegroundColor Red
  Get-WinEvent -FilterHashtable @{ LogName = "Application"; ProviderName = ".NET Runtime"; StartTime = (Get-Date).AddMinutes(-5) } `
    -MaxEvents 3 -ErrorAction SilentlyContinue |
    ForEach-Object { Write-Host $_.Message; Write-Host "----" }
  throw "Service installed but not running. Status=$($svc.Status). Re-run Install after fixing the error above."
}

Write-Host ""
Write-Host "OK - Service running."
Write-Host "  Cloud : $CloudUrl"
Write-Host "  Local : http://127.0.0.1:$Port/api/health"
Write-Host ""
Write-Host "On the fingerprint machine, set Cloud Server to THIS PC IP, port $Port."
'@

$internalUninstall = @'
$ErrorActionPreference = "Stop"
$ServiceName = "SyncOpsDeviceAgent"
$InstallDir = Join-Path $env:ProgramFiles "SyncOps\DeviceAgent"
$RuleName = "SyncOps Device Agent ADMS"

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]$identity
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Administrator required."
}

foreach ($name in @($ServiceName, "BeautoraDeviceAgent")) {
  $svc = Get-Service -Name $name -ErrorAction SilentlyContinue
  if ($svc) {
    Stop-Service $name -Force -ErrorAction SilentlyContinue
    sc.exe delete $name | Out-Null
    Write-Host "Removed service $name"
  }
}
Get-Process -Name "Beautora.DeviceAgent" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

if (Test-Path $InstallDir) {
  Remove-Item $InstallDir -Recurse -Force
  Write-Host "Removed $InstallDir"
}

netsh advfirewall firewall delete rule name="$RuleName" | Out-Null
Write-Host "Done."
'@

Set-Content -Path (Join-Path $appDir "_install.ps1") -Value $internalInstall -Encoding UTF8
Set-Content -Path (Join-Path $appDir "_uninstall.ps1") -Value $internalUninstall -Encoding UTF8

# Hide technical folder so customer mainly sees Install / Uninstall
attrib +h +s $appDir

# Zip for easy handoff
$zipPath = "$OutRoot.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
# Temporarily unhide for zip content, then re-hide
attrib -h -s $appDir
Compress-Archive -Path (Join-Path $OutRoot "*") -DestinationPath $zipPath -Force
attrib +h +s $appDir

Write-Host ""
Write-Host "Customer package ready:" -ForegroundColor Green
Write-Host "  Folder : $OutRoot"
Write-Host "  Zip    : $zipPath"
Write-Host ""
Write-Host "Give the customer the ZIP (or the folder). They only need:"
Write-Host "  Install.bat"
Write-Host "  Uninstall.bat"
Write-Host ""
Write-Host "No .NET SDK, no source code, no Visual Studio required on their PC."
