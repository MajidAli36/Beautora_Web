# Install Beautora Device Agent as a Windows Service
# Run from an elevated PowerShell (Administrator).

param(
  [string]$PublishDir = "$PSScriptRoot\..\publish",
  [string]$ServiceName = "BeautoraDeviceAgent",
  [string]$DisplayName = "Beautora Device Agent"
)

$ErrorActionPreference = "Stop"
$project = Join-Path $PSScriptRoot "..\src\Beautora.DeviceAgent\Beautora.DeviceAgent.csproj"

Write-Host "Publishing..."
dotnet publish $project -c Release -o $PublishDir

$exe = Join-Path $PublishDir "Beautora.DeviceAgent.exe"
if (-not (Test-Path $exe)) { throw "Published exe not found: $exe" }

$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Stopping existing service..."
  Stop-Service $ServiceName -Force -ErrorAction SilentlyContinue
  sc.exe delete $ServiceName | Out-Null
  Start-Sleep -Seconds 2
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
"@
