# Beautora Device Agent — Next.js integration contract

The Device Agent is a **local Windows hardware bridge**. Beautora Next.js owns all business logic.

Do **not** call invoice/token/customer APIs from the agent.

## Base URL

```text
http://127.0.0.1:17890
```

## Auth

Every `/api/*` route except `/api/health` requires:

```http
X-Beautora-Agent-Key: <ApiKey from appsettings.json>
```

or

```http
X-SyncOps-Agent-Key: <ApiKey from appsettings.json>
```

or

```http
Authorization: Bearer <ApiKey>
```

CORS allows configured Beautora origins only (see `DeviceAgent:AllowedOrigins`).

## TypeScript contract (future Next.js client)

```typescript
export type PrintContentType = "text" | "escpos-base64";

export interface PrintRequest {
  printerId?: string;
  contentType: PrintContentType;
  /** Plain text OR base64 ESC/POS bytes — already prepared by Beautora */
  content: string;
  copies?: number;
}

export interface PrintResult {
  success: boolean;
  message: string;
  jobId?: string;
}

export interface DrawerResult {
  success: boolean;
  message: string;
}

export interface DeviceInfo {
  id: string;
  type: "printer" | "drawer" | "fingerprint";
  name: string;
  status: string;
}

export interface BeautoraDeviceAgent {
  getHealth(): Promise<{ status: string; agentVersion: string }>;
  getDevices(): Promise<{ agent: { version: string; status: string }; devices: DeviceInfo[] }>;
  print(request: PrintRequest): Promise<PrintResult>;
  openDrawer(drawerId: string): Promise<DrawerResult>;
  scanFingerprint(deviceId: string): Promise<{ success: boolean; templateId?: string }>;
}
```

## Mandatory separation

### Normal POS (cash)

```ts
await agent.print({ printerId, contentType: "text", content: receiptText });
await agent.openDrawer(drawerId); // explicit — only when Beautora decides
```

### Token

```ts
await agent.print({ printerId, contentType: "text", content: tokenText });
// DO NOT call openDrawer
```

The agent never auto-opens the drawer after print.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Liveness (no auth) |
| GET | `/api/devices` | Legacy discovery |
| POST | `/api/devices/refresh` | Legacy refresh |
| GET | `/api/printer/list` | Printers |
| POST | `/api/printer/print` | Print supplied content |
| POST | `/api/printer/{id}/test` | Test page |
| GET | `/api/drawer/list` | Drawers |
| POST | `/api/drawer/{id}/open` | Open drawer only |
| GET | `/api/fingerprint/list` | Fingerprint devices |
| POST | `/api/fingerprint/{id}/scan` | Scan (mock unless SDK linked) |
| GET | `/api/devices/{id}` | SyncOps device details |
| GET | `/api/devices/{id}/status` | SyncOps status |
| GET | `/api/devices/{id}/capabilities` | SyncOps capabilities |
| POST | `/api/devices/{id}/connect` | SyncOps connect |
| POST | `/api/devices/{id}/disconnect` | SyncOps disconnect |
| POST | `/api/devices/discover` | SyncOps discovery |
| POST | `/api/devices/{id}/print` | Capability: print |
| POST | `/api/devices/{id}/cash-drawer/open` | Capability: drawer |
| GET | `/api/devices/{id}/users` | Capability: user directory |
| GET | `/api/devices/{id}/attendance` | Capability: attendance |
| GET | `/api/devices/{id}/time` | Capability: device time |
| GET | `/api/devices/{id}/info` | Live device info |
| GET | `/api/beautora/attendance/status` | Beautora bridge status |
| POST | `/api/beautora/attendance/sync` | Pull ZK logs → POST Beautora `/api/devices/attendance` |
| POST | `/api/beautora/attendance/punch` | Live thumb punch → Beautora (`{ thumbId, action }`) |
| POST | `/api/devices/{id}/attendance/simulate-punch` | Mock ZK punch + optional Beautora push |

## Beautora attendance bridge

Configure in `appsettings.json`:

```json
"Beautora": {
  "AppUrl": "http://localhost:3000",
  "AttendanceApiKey": "<Devices → Attendance terminal API key>",
  "AttendanceDeviceId": "",
  "AttendanceSyncEnabled": true,
  "AttendanceSyncIntervalSeconds": 15,
  "AttendanceLookbackHours": 24
}
```

Flow:

1. Staff thumb IDs on Beautora `/attendance` must match ZKTeco **user IDs**.
2. Agent reads `GET /api/devices/{id}/attendance` via SyncOps SDK.
3. Agent posts each new punch to Beautora with `thumbId`, `action`, `at`, `externalKey`.
4. `/attendance` shows real BIOMETRIC rows (manual stays `MANUAL`).

Browser on the same PC can also call the agent directly (CORS allowed for localhost:3000) using `X-Beautora-Agent-Key`.

## Example curl

```bash
curl http://127.0.0.1:17890/api/health

curl -H "X-Beautora-Agent-Key: SyncOps@12345" \
  http://127.0.0.1:17890/api/devices

curl -X POST http://127.0.0.1:17890/api/printer/print \
  -H "X-Beautora-Agent-Key: SyncOps@12345" \
  -H "Content-Type: application/json" \
  -d "{\"contentType\":\"text\",\"content\":\"Hello from Beautora\\n\",\"copies\":1}"

curl -X POST http://127.0.0.1:17890/api/drawer/drawer-mock/open \
  -H "X-Beautora-Agent-Key: SyncOps@12345"
```
