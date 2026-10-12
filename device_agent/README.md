# SyncOps Device Platform

Local Windows hardware platform for Beautora POS and future SyncOps products.

**Packages:** SyncOps Device SDK + Device Agent + Device Adapters

## Architecture

```text
Beautora / apps  →  Device Agent (HTTP)  →  Device SDK  →  Adapters  →  Hardware
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/INTEGRATION.md](docs/INTEGRATION.md).

## Projects

| Project | Role |
|---------|------|
| `SyncOps.DeviceSDK` | Vendor-neutral contracts, manager, discovery, registry, transports |
| `SyncOps.DeviceAdapters.Printers` | Windows / ESC/POS printers |
| `SyncOps.DeviceAdapters.CashDrawers` | Printer-kick cash drawers |
| `SyncOps.DeviceAdapters.Fingerprint` | Mock fingerprint adapter |
| `SyncOps.DeviceAdapters.ZKTeco` | ZKTeco attendance terminal adapter |
| `Beautora.DeviceAgent` | Windows host (service + tray + local API) — assembly name kept for compatibility |

## Requirements

- Windows 10/11
- .NET 8 SDK

## Run locally

```powershell
cd D:\Projects\SaaS_Salon\device_agent\src\Beautora.DeviceAgent
dotnet run
```

Default:

- URL: `http://127.0.0.1:17890`
- MockMode: `true`
- API key: `appsettings.json` → `DeviceAgent:ApiKey`
- Auth headers: `X-Beautora-Agent-Key` or `X-SyncOps-Agent-Key`

## ZKTeco

Configured device (example):

- Device: `192.168.1.201:4370`
- PC: `192.168.1.100`

```json
"Zkteco": {
  "Enabled": true,
  "ProtocolMode": "mock",
  "Host": "192.168.1.201",
  "Port": 4370
}
```

`ProtocolMode` values:

- `mock` — full API without hardware
- `tcp-probe` — verifies TCP reachability; data ops need vendor SDK
- `vendor-sdk` — placeholder until Standalone SDK DLLs are linked inside the ZKTeco adapter

## Beautora cloud (local SDK → https://www.beautora.app)

Local agent owns hardware. **All DB / attendance uploads** go to Beautora SaaS:

```text
ZK / devices → Device Agent (this PC :17890) → https://www.beautora.app
```

Default `DeviceAgent:Beautora:AppUrl` is **`https://www.beautora.app`**.  
Development (`appsettings.Development.json`) uses `http://localhost:3000`.  
Override anytime with env `BEAUTORA_APP_URL`.

See [docs/CLOUD-AND-SERVICE.md](docs/CLOUD-AND-SERVICE.md).

## Beautora attendance (thumb → `/attendance`)

1. In Beautora **Devices**, create an **Attendance terminal** and copy its API key (optional for ADMS thumb-punch).
2. On **Attendance**, enroll each stylist’s ZK user id as their **Thumb ID**.
3. Production `appsettings.json`:

```json
"Beautora": {
  "AppUrl": "https://www.beautora.app",
  "AttendanceApiKey": "<attendance-terminal-api-key>",
  "AttendanceSyncEnabled": true
}
```

4. Run the agent (or Windows service), open `https://www.beautora.app/attendance` on the salon PC.
5. Manual check-in still works if the agent or scanner is offline.

Hardware integration test:

```powershell
$env:SYNCOPS_ZKTECO_INTEGRATION = "1"
dotnet test tests/SyncOps.DeviceAdapters.ZKTeco.Tests
```

## Tests

```powershell
cd D:\Projects\SaaS_Salon\device_agent
dotnet test SyncOps.DevicePlatform.slnx
```

## Customer installer (no .NET / no source for salons)

**On your PC** (has .NET SDK), build the package:

```powershell
cd device_agent\installer
.\build-customer-package.ps1
```

Give the salon **`dist\SyncOps-DeviceAgent.zip`**. They only see:

- **Install.bat** — install background service (starts with Windows)
- **Uninstall.bat** — remove everything

No SDK, no Visual Studio, no project files on their machine.  
Cloud: `https://www.beautora.app` · Guide: [installer/README-SETUP.md](installer/README-SETUP.md)

## Backward compatibility

Legacy Beautora routes still work:

- `/api/printer/*`, `/api/drawer/*`, `/api/fingerprint/*`
- `/api/health`, `/api/devices`, `/api/devices/refresh`

New SyncOps routes:

- `/api/devices/{id}/connect|disconnect|status|capabilities|info`
- `/api/devices/discover`
- `/api/devices/{id}/print`
- `/api/devices/{id}/cash-drawer/open`
- `/api/devices/{id}/users`
- `/api/devices/{id}/attendance`
- `/api/devices/{id}/time`
