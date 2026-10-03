# Ensure Windows Firewall allows ZKTeco Cloud/ADMS → Device Agent on TCP 17890
# Run elevated (Administrator) PowerShell:
#   .\installer\open-firewall.ps1

param(
  [int]$Port = 17890,
  [string]$RuleName = "SyncOps Device Agent ADMS 17890"
)

$ErrorActionPreference = "Stop"

$existing = Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue
if ($existing) {
  Remove-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue
}

New-NetFirewallRule `
  -DisplayName $RuleName `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort $Port `
  -Action Allow `
  -Profile Any `
  -Description "Allow ZKTeco ADMS/Cloud Server push to SyncOps Device Agent" | Out-Null

Write-Host "Firewall rule OK: $RuleName (TCP $Port, Profile=Any)"
Write-Host "Device Cloud Server must be:"
$ip = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -like '192.168.1.*' -and $_.IPAddress -ne '127.0.0.1' } |
  Select-Object -First 1 -ExpandProperty IPAddress
if (-not $ip) {
  $ip = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
    Select-Object -First 1 -ExpandProperty IPAddress)
}
Write-Host "  Server Address = $ip"
Write-Host "  Server Port    = $Port"
Write-Host "  Proxy          = OFF"
Write-Host "  Mode           = ADMS"
