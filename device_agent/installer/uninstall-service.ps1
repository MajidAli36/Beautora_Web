param([string]$ServiceName = "BeautoraDeviceAgent")
$ErrorActionPreference = "Stop"
$svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($svc) {
  Stop-Service $ServiceName -Force -ErrorAction SilentlyContinue
  sc.exe delete $ServiceName | Out-Null
  Write-Host "Removed service $ServiceName"
} else {
  Write-Host "Service not found: $ServiceName"
}
