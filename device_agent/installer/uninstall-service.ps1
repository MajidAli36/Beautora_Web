# Remove SyncOps Device Agent Windows Service
param(
  [string]$ServiceName = "SyncOpsDeviceAgent",
  [string]$LegacyServiceName = "BeautoraDeviceAgent",
  [string]$InstallDir = "$env:ProgramFiles\SyncOps\DeviceAgent",
  [switch]$RemoveFiles
)

$ErrorActionPreference = "Stop"

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]$identity
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Run as Administrator."
}

foreach ($name in @($ServiceName, $LegacyServiceName)) {
  $svc = Get-Service -Name $name -ErrorAction SilentlyContinue
  if ($svc) {
    Stop-Service $name -Force -ErrorAction SilentlyContinue
    sc.exe delete $name | Out-Null
    Write-Host "Removed service $name"
  } else {
    Write-Host "Service not found: $name"
  }
}

Get-Process -Name "Beautora.DeviceAgent" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

if ($RemoveFiles -and (Test-Path $InstallDir)) {
  Remove-Item $InstallDir -Recurse -Force
  Write-Host "Removed $InstallDir"
}

Write-Host "Uninstall complete."
