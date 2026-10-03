param(
  [string]$ServiceName = "SyncOpsDeviceAgent",
  [string]$LegacyServiceName = "BeautoraDeviceAgent"
)
$ErrorActionPreference = "Stop"

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
