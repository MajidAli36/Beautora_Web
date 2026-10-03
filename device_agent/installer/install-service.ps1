# Install SyncOps Device Agent as a Windows Service
# Run from an elevated PowerShell (Administrator).
# Assembly name remains Beautora.DeviceAgent.exe for backward compatibility.

param(
  [string]$PublishDir = "$PSScriptRoot\..\publish",
  [string]$ServiceName = "SyncOpsDeviceAgent",
  [string]$DisplayName = "SyncOps Device Agent",
  [string]$LegacyServiceName = "BeautoraDeviceAgent"
)

$ErrorActionPreference = "Stop"
$project = Join-Path $PSScriptRoot "..\src\Beautora.DeviceAgent\Beautora.DeviceAgent.csproj"

Write-Host "Publishing..."
dotnet publish $project -c Release -o $PublishDir

$exe = Join-Path $PublishDir "Beautora.DeviceAgent.exe"
if (-not (Test-Path $exe)) { throw "Published exe not found: $exe" }

foreach ($name in @($LegacyServiceName, $ServiceName)) {
  $existing = Get-Service -Name $name -ErrorAction SilentlyContinue
  if ($existing) {
    Write-Host "Stopping existing service $name..."
    Stop-Service $name -Force -ErrorAction SilentlyContinue
    sc.exe delete $name | Out-Null
    Start-Sleep -Seconds 2
  }
}

Write-Host "Creating service $ServiceName ..."
New-Service -Name $ServiceName -BinaryPathName "`"$exe`"" -DisplayName $DisplayName -StartupType Automatic
Start-Service $ServiceName
Get-Service $ServiceName | Format-List *

Write-Host @"

Installed.
Health:  http://127.0.0.1:17890/api/health
Uninstall: .\uninstall-service.ps1

Edit $PublishDir\appsettings.json then: Restart-Service $ServiceName

For real ZKTeco hardware set:
  DeviceAgent:MockMode = false
  DeviceAgent:Zkteco:ProtocolMode = tcp-probe   # or vendor-sdk when SDK linked
  DeviceAgent:Zkteco:Host = 192.168.1.201
  DeviceAgent:Zkteco:Port = 4370
"@
