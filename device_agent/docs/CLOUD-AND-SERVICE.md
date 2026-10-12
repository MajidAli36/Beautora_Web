# Beautora cloud URL + Windows background service

## Architecture (any salon PC)

```text
┌─────────────────────┐     LAN ADMS / TCP      ┌──────────────────────────────┐
│  ZK / printers /    │ ──────────────────────► │  SyncOps Device Agent        │
│  fingerprint /      │                         │  (Windows Service on PC)     │
│  cash drawer        │ ◄────────────────────── │  http://127.0.0.1:17890      │
└─────────────────────┘     local SDK commands  └──────────────┬───────────────┘
                                                               │
                                                               │ HTTPS
                                                               │ /api/agent/thumb-punch
                                                               │ /api/devices/attendance
                                                               ▼
                                                    ┌──────────────────────────┐
                                                    │ https://www.beautora.app │
                                                    │  (Beautora SaaS + DB)    │
                                                    └──────────────────────────┘
```

- **Hardware stays local** — the agent/SDK runs on the salon Windows PC.
- **All DB / attendance / cloud updates** go to **`https://www.beautora.app`** (not localhost), unless you override for development.
- The browser on `https://www.beautora.app/attendance` still talks to `127.0.0.1:17890` for live device status (same PC only).

## Cloud URL resolution (audit)

| Priority | Source | Example |
|----------|--------|---------|
| 1 | Env `BEAUTORA_APP_URL` | `https://www.beautora.app` |
| 2 | `DeviceAgent:Beautora:AppUrl` in appsettings | same |
| 3 | Code default `BeautoraCloudUrls.Production` | `https://www.beautora.app` |

Development (`ASPNETCORE_ENVIRONMENT=Development` / `dotnet run` from IDE) uses `appsettings.Development.json` → `http://localhost:3000`.

### Paths that always use `AppUrl`

| Path | Used for |
|------|----------|
| `POST {AppUrl}/api/agent/thumb-punch` | ADMS + realtime watcher punches (agent API key) |
| `POST {AppUrl}/api/devices/attendance` | Bridge sync / Devices API key |
| `SyncOpsCloud:BaseUrl` | Future cloud heartbeat / device platform |

Printers, drawers, fingerprint, and future adapters stay on the **local agent API**; only cloud-owned records are posted to Beautora.

## Install as background service (any local machine)

1. Install [.NET 8 Desktop Runtime](https://dotnet.microsoft.com/download/dotnet/8.0) on the PC (or use self-contained publish).
2. Open **PowerShell as Administrator**.
3. Run:

```powershell
cd D:\Projects\SaaS_Salon\device_agent\installer

# Production (default cloud)
.\install-service.ps1 -OpenFirewall -ZktecoHost "192.168.1.201"

# Or explicit cloud URL
.\install-service.ps1 -AppUrl "https://www.beautora.app" -ZktecoHost "192.168.1.201" -OpenFirewall
```

4. On the ZK device **Cloud Server**:
   - Address = **this PC’s LAN IP** (e.g. `192.168.1.100`) — **not** beautora.app
   - Port = `17890`
   - Proxy = OFF, ADMS mode
5. Verify:
   - `http://127.0.0.1:17890/api/health`
   - Agent log line: `Cloud DB/API → https://www.beautora.app`
   - Open `https://www.beautora.app/attendance` on the same PC and press thumb

### Service commands

```powershell
Get-Service SyncOpsDeviceAgent
Restart-Service SyncOpsDeviceAgent
Stop-Service SyncOpsDeviceAgent
.\uninstall-service.ps1
```

### Config after install

Edit `device_agent\publish\appsettings.json`:

```json
"Beautora": {
  "AppUrl": "https://www.beautora.app",
  "AttendanceApiKey": "",
  "AttendanceSyncEnabled": true
}
```

Then `Restart-Service SyncOpsDeviceAgent`.

Optional machine-wide env (installer already sets these):

```powershell
[Environment]::SetEnvironmentVariable("BEAUTORA_APP_URL", "https://www.beautora.app", "Machine")
[Environment]::SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Production", "Machine")
```

## Local development only

```powershell
cd device_agent\src\Beautora.DeviceAgent
$env:ASPNETCORE_ENVIRONMENT = "Development"
dotnet run
```

Uses `http://localhost:3000` via `appsettings.Development.json`.

## Auth checklist (production)

| Call | Header | Value |
|------|--------|--------|
| Agent ← browser | `X-Beautora-Agent-Key` | `DeviceAgent:ApiKey` (default `SyncOps@12345`) |
| Agent → Beautora thumb-punch | `X-Beautora-Agent-Key` | same key; must match Beautora `SYNCOPS_AGENT_API_KEY` |
| Agent → Beautora devices attendance | `X-Device-Key` | Devices → Attendance terminal API key |

Keep `DeviceAgent:ApiKey` identical to the key baked into Beautora (`lib/devices/syncops-agent.ts`) or thumb-punch returns 401.
