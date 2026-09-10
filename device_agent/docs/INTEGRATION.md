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
| GET | `/api/devices` | Discovery |
| POST | `/api/devices/refresh` | Refresh |
| GET | `/api/printer/list` | Printers |
| POST | `/api/printer/print` | Print supplied content |
| POST | `/api/printer/{id}/test` | Test page |
| GET | `/api/drawer/list` | Drawers |
| POST | `/api/drawer/{id}/open` | Open drawer only |
| GET | `/api/fingerprint/list` | Fingerprint devices |
| POST | `/api/fingerprint/{id}/scan` | Scan (mock unless SDK linked) |

## Example curl

```bash
curl http://127.0.0.1:17890/api/health

curl -H "X-Beautora-Agent-Key: change-me-local-dev-key" \
  http://127.0.0.1:17890/api/devices

curl -X POST http://127.0.0.1:17890/api/printer/print \
  -H "X-Beautora-Agent-Key: change-me-local-dev-key" \
  -H "Content-Type: application/json" \
  -d "{\"contentType\":\"text\",\"content\":\"Hello from Beautora\\n\",\"copies\":1}"

curl -X POST http://127.0.0.1:17890/api/drawer/drawer-mock/open \
  -H "X-Beautora-Agent-Key: change-me-local-dev-key"
```
