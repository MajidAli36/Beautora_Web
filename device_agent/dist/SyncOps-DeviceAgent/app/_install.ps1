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
