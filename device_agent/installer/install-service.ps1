# Install SyncOps Device Agent as a lightweight Windows Service.
# Runs at every Windows boot (background), posts punches to https://www.beautora.app
#
# Run as Administrator:
#   .\install-service.ps1
#   .\install-service.ps1 -ZktecoHost "192.168.1.201" -OpenFirewall
#   .\setup.bat   (double-click helper)

param(
  [string]$InstallDir = "$env:ProgramFiles\SyncOps\DeviceAgent",
  [string]$ServiceName = "SyncOpsDeviceAgent",
  [string]$DisplayName = "SyncOps Device Agent",
  [string]$LegacyServiceName = "BeautoraDeviceAgent",
  [string]$AppUrl = "https://www.beautora.app",
  [string]$ZktecoHost = "",
  [int]$ZktecoPort = 4370,
  [switch]$OpenFirewall,
  [switch]$FrameworkDependent
)

$ErrorActionPreference = "Stop"

# Require elevation
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]$identity
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Run this script as Administrator (right-click PowerShell → Run as administrator)."
}

$project = Join-Path $PSScriptRoot "..\src\Beautora.DeviceAgent\Beautora.DeviceAgent.csproj"
$staging = Join-Path $PSScriptRoot "..\publish\service"
$cloudUrl = ($AppUrl.Trim().TrimEnd("/"))
if (-not $cloudUrl) { $cloudUrl = "https://www.beautora.app" }

Write-Host ""
Write-Host "=== SyncOps Device Agent setup ===" -ForegroundColor Cyan
Write-Host "Cloud DB/API : $cloudUrl"
Write-Host "Install dir  : $InstallDir"
Write-Host "Service      : $ServiceName (Automatic Delayed Start)"
Write-Host ""

# Stop old instances
foreach ($name in @($LegacyServiceName, $ServiceName)) {
  $existing = Get-Service -Name $name -ErrorAction SilentlyContinue
  if ($existing) {
    Write-Host "Stopping $name..."
    Stop-Service $name -Force -ErrorAction SilentlyContinue
    sc.exe delete $name | Out-Null
    Start-Sleep -Seconds 2
  }
}
Get-Process -Name "Beautora.DeviceAgent" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging -Force | Out-Null

Write-Host "Publishing lean Release build..."
$env:ASPNETCORE_ENVIRONMENT = "Production"
$publishArgs = @(
  "publish", $project,
  "-c", "Release",
  "-o", $staging,
  "-r", "win-x64",
  "/p:EnvironmentName=Production",
  "/p:PublishReadyToRun=true"
)
if ($FrameworkDependent) {
  $publishArgs += @("--self-contained", "false")
} else {
  # No separate .NET install required on salon PCs
  $publishArgs += @(
    "--self-contained", "true",
    "/p:PublishSingleFile=true",
    "/p:IncludeNativeLibrariesForSelfExtract=true",
    "/p:EnableCompressionInSingleFile=true"
  )
}
& dotnet @publishArgs
if ($LASTEXITCODE -ne 0) { throw "dotnet publish failed ($LASTEXITCODE)" }

$exe = Join-Path $staging "Beautora.DeviceAgent.exe"
if (-not (Test-Path $exe)) { throw "Published exe not found: $exe" }

function Set-LeanSettings([string]$path, [string]$url, [string]$zkHost, [int]$zkPort) {
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
  if (-not $da.Beautora) {
    $da | Add-Member -NotePropertyName Beautora -NotePropertyValue ([pscustomobject]@{}) -Force
  }
  $da.Beautora | Add-Member -NotePropertyName AppUrl -NotePropertyValue $url -Force
  $da.Beautora | Add-Member -NotePropertyName AttendanceSyncEnabled -NotePropertyValue $true -Force
  $da.Beautora | Add-Member -NotePropertyName AttendanceSyncIntervalSeconds -NotePropertyValue 30 -Force
  if (-not $da.Zkteco) {
    $da | Add-Member -NotePropertyName Zkteco -NotePropertyValue ([pscustomobject]@{}) -Force
  }
  $da.Zkteco | Add-Member -NotePropertyName Enabled -NotePropertyValue $true -Force
  $da.Zkteco | Add-Member -NotePropertyName ProtocolMode -NotePropertyValue "push-buffer" -Force
  $da.Zkteco | Add-Member -NotePropertyName EnableTcpWatcher -NotePropertyValue $false -Force
  if ($zkHost) {
    $da.Zkteco | Add-Member -NotePropertyName Host -NotePropertyValue $zkHost -Force
    $da.Zkteco | Add-Member -NotePropertyName Port -NotePropertyValue $zkPort -Force
  }
  if (-not $json.SyncOpsCloud) {
    $json | Add-Member -NotePropertyName SyncOpsCloud -NotePropertyValue ([pscustomobject]@{}) -Force
  }
  $json.SyncOpsCloud | Add-Member -NotePropertyName BaseUrl -NotePropertyValue $url -Force
  $json | ConvertTo-Json -Depth 10 | Set-Content -Path $path -Encoding UTF8
}

Set-LeanSettings (Join-Path $staging "appsettings.json") $cloudUrl $ZktecoHost $ZktecoPort
Set-LeanSettings (Join-Path $staging "appsettings.Production.json") $cloudUrl $ZktecoHost $ZktecoPort

Write-Host "Copying to $InstallDir ..."
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
Copy-Item -Path (Join-Path $staging "*") -Destination $InstallDir -Recurse -Force

$installedExe = Join-Path $InstallDir "Beautora.DeviceAgent.exe"

# Machine env so service always hits Beautora cloud
[Environment]::SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Production", "Machine")
[Environment]::SetEnvironmentVariable("BEAUTORA_APP_URL", $cloudUrl, "Machine")

Write-Host "Creating Windows Service (starts with Windows)..."
New-Service `
  -Name $ServiceName `
  -BinaryPathName "`"$installedExe`"" `
  -DisplayName $DisplayName `
  -Description "Local SyncOps hardware bridge. Devices stay on this PC; attendance syncs to $cloudUrl." `
  -StartupType Automatic | Out-Null

# Delayed auto-start = less RAM/CPU fight during Windows boot
sc.exe config $ServiceName start= delayed-auto | Out-Null
# Restart on failure
sc.exe failure $ServiceName reset= 86400 actions= restart/10000/restart/30000/restart/60000 | Out-Null
sc.exe failureflag $ServiceName 1 | Out-Null

# Free listen port if a previous agent is still bound
try {
  $owners = Get-NetTCPConnection -LocalPort 17890 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($procId in $owners) {
    if ($procId -and $procId -ne 0) {
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
  }
} catch { }

$started = $false
for ($i = 1; $i -le 3; $i++) {
  try {
    Start-Service $ServiceName -ErrorAction Stop
    Start-Sleep -Seconds 2
    if ((Get-Service $ServiceName).Status -eq "Running") { $started = $true; break }
  } catch {
    Write-Host "Start attempt $i failed: $($_.Exception.Message)" -ForegroundColor Yellow
    Start-Sleep -Seconds 3
  }
}
if (-not $started) {
  Write-Host "Service failed to start. Recent .NET errors:" -ForegroundColor Red
  Get-WinEvent -FilterHashtable @{ LogName = "Application"; ProviderName = ".NET Runtime"; StartTime = (Get-Date).AddMinutes(-5) } `
    -MaxEvents 3 -ErrorAction SilentlyContinue |
    ForEach-Object { Write-Host $_.Message; Write-Host "----" }
  throw "Could not start $ServiceName. Fix the error above, then re-run this script."
}

if ($OpenFirewall) {
  $fw = Join-Path $PSScriptRoot "open-firewall.ps1"
  if (Test-Path $fw) {
    Write-Host "Opening firewall for ZK ADMS (port 17890)..."
    & $fw
  }
}

$svc = Get-Service $ServiceName
Write-Host ""
Write-Host "Done." -ForegroundColor Green
Write-Host "  Status     : $($svc.Status)"
Write-Host "  Starts     : Every Windows boot (Delayed Automatic)"
Write-Host "  Cloud      : $cloudUrl"
Write-Host "  Local API  : http://127.0.0.1:17890/api/health"
Write-Host "  Files      : $InstallDir"
Write-Host ""
Write-Host "ZK Cloud Server on the device must be THIS PC LAN IP, port 17890 (not beautora.app)."
Write-Host "Uninstall:  .\uninstall-service.ps1"
Write-Host ""
