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
