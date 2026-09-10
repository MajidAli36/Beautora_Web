# Beautora Device Agent

Local Windows hardware agent for Beautora POS.

**Responsibilities:** printer, cash drawer, fingerprint (hardware only).  
**Not responsible:** invoices, tokens, customers, money, or any Beautora business logic.

## Requirements

- Windows 10/11
- .NET 8 SDK (project targets `net8.0-windows`; .NET 9 was requested but this machine has 8/10 — 8 LTS is used)

## Run locally (dev)

```powershell
cd D:\Projects\SaaS_Salon\device_agent\src\Beautora.DeviceAgent
dotnet run
```

Default:

- URL: `http://127.0.0.1:17890`
- MockMode: `true` (safe without hardware)
- API key: see `appsettings.json` → `DeviceAgent:ApiKey`

Health (no auth):

```powershell
curl http://127.0.0.1:17890/api/health
```

## Configure

Edit `appsettings.json`:

```json
{
  "DeviceAgent": {
    "Host": "127.0.0.1",
    "Port": 17890,
    "ApiKey": "your-long-secret",
    "MockMode": false,
    "DefaultPrinterId": "",
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://www.beautora.app",
      "https://beautora.app"
    ]
  }
}
```

Set `MockMode` to `false` on a salon POS PC with a real printer.

## Test printer

```powershell
$headers = @{ "X-Beautora-Agent-Key" = "change-me-local-dev-key" }
Invoke-RestMethod http://127.0.0.1:17890/api/printer/list -Headers $headers
Invoke-RestMethod http://127.0.0.1:17890/api/printer/print -Method POST -Headers $headers -ContentType "application/json" -Body '{"contentType":"text","content":"Beautora test\n","copies":1}'
```

## Test drawer (separate from print)

```powershell
Invoke-RestMethod http://127.0.0.1:17890/api/drawer/list -Headers $headers
Invoke-RestMethod http://127.0.0.1:17890/api/drawer/drawer-mock/open -Method POST -Headers $headers
```

Printing never opens the drawer. Beautora must call drawer open explicitly for cash POS only.

## Test fingerprint (mock)

```powershell
Invoke-RestMethod http://127.0.0.1:17890/api/fingerprint/list -Headers $headers
Invoke-RestMethod http://127.0.0.1:17890/api/fingerprint/fingerprint-mock/scan -Method POST -Headers $headers
```

ZKTeco / DigitalPersona are adapter stubs until vendor SDKs are linked.

## Tests

```powershell
cd D:\Projects\SaaS_Salon\device_agent
dotnet test
```

## Windows Service

See `installer/install-service.ps1`.

## Architecture

See `docs/INTEGRATION.md`.

Legacy Node agent (`scripts/device-agent.mjs` in the Beautora repo) remains available; this C# agent is the new standalone product under `device_agent/`.
