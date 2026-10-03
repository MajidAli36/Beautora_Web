# SyncOps Device Platform — Architecture & Migration Plan

**Phase:** 1 (analysis only — no destructive code changes)  
**Date:** 2026-09-29  
**Source tree analyzed:** `device_agent/` (Beautora Device Agent)

---

## 1. Executive summary

The current project is a **working, single-process Windows .NET 8 local agent** for Beautora POS hardware (printer, cash drawer, fingerprint stubs). It already has:

- Localhost HTTP API (`127.0.0.1:17890`)
- API-key auth + loopback enforcement + CORS
- Mock mode
- Windows Service + WinForms tray
- Unit tests for printer/drawer/fingerprint/auth constants

It is **not yet** a reusable vendor-neutral platform. Abstractions are **service-oriented by POS concern** (`IPrinterService`, `IDrawerService`, `IFingerprintService`), not **adapter/capability-oriented**. There is no persistent device registry, no transport layer, no real ZKTeco protocol/SDK integration, and no solution-level multi-project structure.

The migration goal is to evolve into:

```text
SyncOps.DeviceSDK          → vendor-neutral contracts + manager + transports
SyncOps.DeviceAdapters.*   → vendor/device implementations (ZKTeco, printers, …)
SyncOps.DeviceAgent        → Windows host, HTTP API, service, tray, security
```

Beautora (and future products) must depend only on the SDK/agent HTTP contract — **never** on ZKTeco or other vendor SDKs.

---

## 2. Current architecture

### 2.1 Project layout (source of truth)

```text
device_agent/
├── README.md
├── docs/
│   └── INTEGRATION.md          # Beautora Next.js HTTP contract
├── installer/
│   ├── install-service.ps1     # Publishes + registers Windows Service
│   └── uninstall-service.ps1
├── src/
│   └── Beautora.DeviceAgent/   # Monolithic ASP.NET Core + WinForms host
└── tests/
    └── Beautora.DeviceAgent.Tests/
```

**Missing today:**

- No `.sln` file
- No separate SDK / adapter projects
- No SQLite / device registry persistence
- No ZKTeco SDK binaries in-repo (and none found under `SaaS_Salon`)

### 2.2 Runtime composition

```text
Beautora Next.js (browser / POS)
        │  HTTP + X-Beautora-Agent-Key
        ▼
┌───────────────────────────────────────────────┐
│  Beautora.DeviceAgent (ASP.NET Core)          │
│  Program.cs                                   │
│    ├─ AgentAuthMiddleware (loopback + API key)│
│    ├─ CORS (BeautoraOrigins)                  │
│    ├─ MapAgentEndpoints (/api/*)              │
│    ├─ DeviceAgentHostedService (5-min refresh)│
│    └─ TrayHostedService (optional STA tray)   │
│                                               │
│  DeviceManager ──► WindowsDeviceDiscovery     │
│       │                 │                     │
│       │    ┌────────────┼────────────┐        │
│       │    ▼            ▼            ▼        │
│       │ IPrinter    IDrawer    IFingerprint   │
│       │ Service     Service    Service        │
│       │    │            │            │        │
│       │ Windows     PrinterKick  Mock /       │
│       │ spooler     ESC/POS      ZK stub /    │
│       │ + Raw       pulse        DP stub      │
│       │ PrinterHelper                         │
└───────────────────────────────────────────────┘
```

### 2.3 Important existing files

| Area | Path | Role |
|------|------|------|
| Host | `Program.cs` | DI, Windows Service, CORS, middleware, endpoints |
| API | `Api/AgentEndpoints.cs` | `/api/health`, devices, printer, drawer, fingerprint |
| Config | `Configuration/DeviceAgentOptions.cs` | Bind address, port, ApiKey, MockMode, CORS, defaults |
| Security | `Security/LocalApiAuthentication.cs` | Fixed-time API key compare, loopback check, middleware |
| Manager | `Devices/DeviceManager/*` | In-memory cache of discovered devices only |
| Discovery | `Devices/DeviceDiscovery/*` | Aggregates printer + drawer + fingerprint lists |
| Printer | `Services/Printer/*` | Windows spooler raw print; Epson/EscPos facades |
| Raw I/O | `Infrastructure/RawPrinterHelper.cs` | winspool.drv RAW + cash-drawer kick bytes |
| Drawer | `Services/Drawer/*` | Drawer = printer kick port; never auto-open on print |
| Fingerprint | `Services/Fingerprint/*` | Mock + ZKTeco/DigitalPersona **stubs** |
| Models | `Models/{Common,Printer,Drawer,Fingerprint}` | DTOs for API/services |
| Hosting | `Hosting/*` | Background refresh + tray UI |
| Tests | `tests/.../AgentTests.cs` | Mock printer/drawer/fingerprint + auth header name |
| Contract | `docs/INTEGRATION.md` | Consumer-facing HTTP contract |

### 2.4 Current hardware abstractions

```csharp
// Service-oriented (today)
IPrinterService      // list / print / status / test
IDrawerService       // list / open / status
IFingerprintService  // list / scan / verify

IDeviceDiscoveryService  // DiscoverAsync() → DeviceInfo[]
IDeviceManager           // GetAll / GetById / Refresh (cache only)
```

**Characteristics:**

- Good separation of **print vs drawer** (architectural rule already enforced)
- Mock mode is **global** (`DeviceAgentOptions.MockMode`), not per-adapter
- Fingerprint vendors are selected by **string heuristics** in `CompositeFingerprintService` (`"zk"`, `"mock"`, …)
- `DeviceInfo.Type` enum is closed: `Printer | Drawer | Fingerprint` only
- No `Connect` / `Disconnect` / `Capabilities` / transports
- No normalized error taxonomy — services return `{ Success, Message }`

### 2.5 What is reusable vs tightly coupled

**Reusable (preserve / extract):**

- `RawPrinterHelper` (Windows RAW printing + drawer kick)
- Printer/drawer/fingerprint service **behavior** and validation rules
- Auth middleware pattern (loopback + fixed-time key compare)
- Endpoint shapes documented in `INTEGRATION.md`
- Mock-first testing approach
- Installer scripts pattern (publish → New-Service)
- Architectural rule: printing never opens drawer

**Beautora-coupled (must soften carefully):**

| Coupling | Location | Risk if changed abruptly |
|----------|----------|--------------------------|
| Namespace `Beautora.DeviceAgent` | Entire project | Breaks tests, installer paths, mental model |
| Header `X-Beautora-Agent-Key` | Auth + docs + tests | Breaks existing/planned Beautiful clients |
| CORS policy name + origins | `Program.cs` / options | Browser POS may fail |
| Service name `BeautoraDeviceAgent` | installer scripts | Existing installs |
| Config section `DeviceAgent` | appsettings | Existing deployments |
| Test print text “Beautora Device Agent” | `WindowsPrinterService` | Cosmetic only |
| Tray branding strings | `TrayHostedService` | Cosmetic |
| `docs/INTEGRATION.md` TypeScript types | Parent repo consumers | Contract breakage |

**Parent-repo coupling (outside this folder):**

- Legacy Node agent: `scripts/device-agent.mjs` (+ env files)
- Beautora UI page `app/(app)/devices/page.tsx` still references the **Node** agent env, not this C# agent exclusively

### 2.6 Gaps vs target platform

| Capability | Today | Target |
|------------|-------|--------|
| Vendor-neutral SDK | No | `SyncOps.DeviceSDK` |
| Capability interfaces | No | `IPrintableDevice`, `IAttendanceDevice`, … |
| Adapter registration | DI only, hard-wired | Pluggable adapter catalog |
| Device connect lifecycle | Implicit | Explicit connect/disconnect |
| Transports | Embedded in services | `IDeviceTransport` (TCP/Serial/HID/USB) |
| Discovery | Windows printers + mocks | Pluggable, configurable (no aggressive scan) |
| Device registry | In-memory cache | Local persisted registry (SQLite) |
| ZKTeco | Stub → mock | Real adapter behind SDK |
| Error model | Free-text messages | Normalized `DeviceErrorCode` |
| Structured op logging | Partial | DeviceId + op + duration + outcome |
| Cloud channel | None | Phase 12 |
| Multi-project solution | Single csproj | SDK + Adapters + Agent + tests |

---

## 3. Target architecture

### 3.1 Layering

```text
                    SYNCOPS CLOUD  (Phase 12+)
                         │
                  HTTPS / WebSocket
                         │
                         ▼
              SYNCOPS DEVICE AGENT
              (Windows .NET 8 host)
              HTTP API · Security · Tray · Service
                         │
                  SyncOps.DeviceSDK
           IDevice · capabilities · DeviceManager
           Discovery · Registry · Transports · Errors
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
   ZKTeco Adapter   Printer Adapter  CashDrawer Adapter
   (SDK or native)  (Windows RAW)    (ESC/POS kick)
         │               │               │
         ▼               ▼               ▼
      Hardware        Hardware        Hardware
```

**Dependency rule:**

```text
Agent  →  SDK  →  (nothing vendor-specific)
Adapters → SDK
Agent  →  Adapters (composition root only)
Beautora → Agent HTTP API (or thin client over SDK contracts)
```

Vendor DLLs (e.g. ZKTeco Standalone SDK) live **only** inside `SyncOps.DeviceAdapters.ZKTeco` (or a private `lib/` folder referenced by that project). They must never be referenced by `SyncOps.DeviceSDK` or Beautora.

### 3.2 Capability-based device model (proposed)

Core identity (every connected device):

```csharp
public interface IDevice
{
    string DeviceId { get; }
    string Manufacturer { get; }
    string Model { get; }
    DeviceType DeviceType { get; }
    DeviceConnectionState ConnectionState { get; }

    Task ConnectAsync(DeviceConnection connection, CancellationToken ct = default);
    Task DisconnectAsync(CancellationToken ct = default);
    Task<DeviceInfo> GetInfoAsync(CancellationToken ct = default);
    Task<DeviceStatus> GetStatusAsync(CancellationToken ct = default);
    Task<IReadOnlyList<DeviceCapability>> GetCapabilitiesAsync(CancellationToken ct = default);
}
```

Optional capabilities (implement only what applies):

| Interface | Typical adapters |
|-----------|------------------|
| `IPrintableDevice` | Windows / ESC/POS printers |
| `ICashDrawerDevice` | Printer-kick drawers, dedicated drawers |
| `IFingerprintDevice` | USB FP readers, some terminals |
| `IAttendanceDevice` | ZKTeco standalone terminals |
| `IUserDirectoryDevice` | ZKTeco user CRUD (later) |
| `IRfidDevice` | RFID readers |
| `IBarcodeScanner` | HID/keyboard wedge / serial scanners |
| `IWeightScale` | Serial/USB scales |

Adapters implement `IDeviceAdapter` as a **factory/provider** that can discover and create `IDevice` instances for a manufacturer/protocol family — they do **not** dump every method onto one mega-interface.

### 3.3 DeviceManager responsibilities

- Register adapters
- Run configured discovery providers
- Match discovered endpoints → compatible adapters
- Maintain connected device instances
- Persist/update local registry
- Route capability operations (`As<IAttendanceDevice>()`, etc.)
- Normalize errors + structured logging
- Support multi-device + cancellation

### 3.4 Discovery

Pluggable `IDiscoveryProvider` implementations:

- `KnownEndpointDiscovery` (explicit IP:port — default for ZKTeco `192.168.1.201:4370`)
- `TcpPortProbeDiscovery` (CIDR optional, **off by default**, concurrency + timeouts required)
- `WindowsPrinterDiscovery`
- Future: USB / HID / Serial / mDNS / vendor UDP broadcast

### 3.5 Local HTTP API evolution

**Keep** existing Beautora routes as a **compatibility layer**.

**Add** generic SDK-shaped routes:

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/devices` | Extended payload (capabilities, connection) |
| GET | `/api/devices/{id}` | |
| GET | `/api/devices/{id}/status` | |
| GET | `/api/devices/{id}/capabilities` | |
| POST | `/api/devices/{id}/connect` | |
| POST | `/api/devices/{id}/disconnect` | |
| POST | `/api/devices/discover` | Uses configured discovery only |
| POST | `/api/devices/{id}/print` | Capability: print |
| POST | `/api/devices/{id}/cash-drawer/open` | Capability: drawer |
| GET | `/api/devices/{id}/users` | Capability: attendance/user dir |
| GET | `/api/devices/{id}/attendance` | Capability: attendance |

Legacy routes remain until Beautora migrates:

- `/api/printer/*`, `/api/drawer/*`, `/api/fingerprint/*`

Auth: keep `X-Beautora-Agent-Key` **and** accept a future `X-SyncOps-Agent-Key` alias.

### 3.6 Target solution structure

```text
device_agent/   (folder may later rename to SyncOps.DevicePlatform)
├── SyncOps.DevicePlatform.sln
├── src/
│   ├── SyncOps.DeviceSDK/
│   ├── SyncOps.DeviceAdapters/
│   │   ├── SyncOps.DeviceAdapters.Printers/
│   │   ├── SyncOps.DeviceAdapters.CashDrawers/
│   │   ├── SyncOps.DeviceAdapters.Fingerprint/
│   │   └── SyncOps.DeviceAdapters.ZKTeco/
│   └── SyncOps.DeviceAgent/          # evolved from Beautora.DeviceAgent
├── tests/
│   ├── SyncOps.DeviceSDK.Tests/
│   ├── SyncOps.DeviceAdapters.ZKTeco.Tests/
│   └── SyncOps.DeviceAgent.Tests/    # includes compat tests for old routes
├── installer/
└── docs/
    ├── ARCHITECTURE.md               # this file
    └── INTEGRATION.md                # keep; extend with SyncOps routes
```

> **Note:** Nested adapter projects under one `SyncOps.DeviceAdapters` folder is preferred over a single mega-assembly so ZKTeco native/vendor refs stay isolated.

---

## 4. Migration plan (phased)

| Phase | Goal | Destructive? |
|-------|------|--------------|
| **1** | Architecture analysis + this document | No |
| **2** | Extract `SyncOps.DeviceSDK` interfaces/models/errors (new projects; agent still compiles) | Additive |
| **3** | Wrap existing printer services behind printer adapter + keep `IPrinterService` facade | Low risk |
| **4** | Wrap cash drawer behind adapter + keep `IDrawerService` facade | Low risk |
| **5** | Wrap fingerprint mock/stubs behind adapters | Low risk |
| **6** | Create ZKTeco adapter shell (`IAttendanceDevice` + connect/info/status) with vendor SDK **or** protocol stub behind `IZktecoProtocol` | Additive |
| **7** | Wire known endpoint `192.168.1.201:4370`; prove connect/disconnect/test | Needs hardware for integration tests |
| **8** | GetUsers / GetAttendanceLogs / GetDeviceTime (only via known SDK/protocol APIs) | Hardware optional for unit tests (fakes) |
| **9** | Refactor Agent API: generic `/api/devices/{id}/…` + keep legacy routes | Medium — contract tests required |
| **10** | Discovery engine + SQLite device registry | Medium |
| **11** | Service/tray rename + tray talks to local HTTP (not DI hardware) | Medium — installer names |
| **12** | Cloud channel (HTTPS/WebSocket) | Separate design |

**Incremental rule:** build + `dotnet test` after each phase. Prefer facades over rewrites.

### 4.1 Compatibility strategy

```text
Beautora HTTP client
        │
        ▼
AgentEndpoints (legacy routes) ──► Compatibility facades
        │                              │
        │                              ▼
        │                     SyncOps DeviceManager
        │                              │
        ▼                              ▼
Generic /api/devices/*  ──────►  Adapters (Printer, Drawer, ZKTeco, …)
```

Until Beautora is updated, **legacy JSON shapes stay stable**. New fields may be added; existing fields must not change meaning.

### 4.2 ZKTeco adapter internal split

```text
SyncOps.DeviceAdapters.ZKTeco
├── ZktecoAdapter                 // IDeviceAdapter
├── ZktecoDevice                  // IDevice + IAttendanceDevice (+ later FP/user)
├── Protocol/
│   └── IZktecoProtocol           // vendor-neutral within adapter
│       ├── ZktecoVendorSdkProtocol   // official Standalone SDK (Phase 6–8)
│       └── ZktecoNativeProtocol      // TODO: replace SDK later
└── Discovery/
    └── ZktecoKnownEndpointDiscovery
```

Unknown APIs → interface method + `UnsupportedOperation` / `TODO` — **do not invent protocol frames**.

---

## 5. Files that will change / be created / stay unchanged

### 5.1 Will be created (Phase 2+)

- `SyncOps.DevicePlatform.sln`
- `src/SyncOps.DeviceSDK/**`
- `src/SyncOps.DeviceAdapters.*/**`
- `tests/SyncOps.DeviceSDK.Tests/**`
- `tests/SyncOps.DeviceAdapters.ZKTeco.Tests/**`
- Adapter mock implementations
- Device registry store (SQLite)
- Optional: `docs/ZKTECO.md` (integration notes for `192.168.1.201:4370`)

### 5.2 Will change (incrementally)

| File / area | Why |
|-------------|-----|
| `Beautora.DeviceAgent.csproj` → eventually `SyncOps.DeviceAgent.csproj` | Rename + project refs |
| `Program.cs` | Register SDK, adapters, dual namespaces |
| `Api/AgentEndpoints.cs` | Add generic routes; keep legacy |
| `Devices/DeviceManager/*` | Become thin wrapper or move into SDK |
| `Devices/DeviceDiscovery/*` | Become providers under SDK discovery |
| `Services/Printer|Drawer|Fingerprint/*` | Become compatibility facades over adapters |
| `Configuration/DeviceAgentOptions.cs` | Add discovery, registry, ZKTeco endpoints; keep old keys |
| `Security/*` | Accept SyncOps header alias |
| `Hosting/*` | Branding + tray via HTTP |
| `installer/*.ps1` | Dual service name transition |
| `docs/INTEGRATION.md` | Document new routes without removing old |
| `README.md` | SyncOps naming + migration notes |
| Tests | Keep existing tests green; add SDK/adapter tests |

### 5.3 Should remain behaviorally unchanged (Phase 2–5)

- Print does **not** open drawer
- Mock mode can run without hardware
- Loopback-only API by default
- Port `17890`
- Existing endpoint paths and core response fields
- Fixed-time API key comparison
- No biometric templates in logs
- No invoice/customer/payment logic in agent

### 5.4 Leave alone for now

- Parent-repo `scripts/device-agent.mjs` (legacy) — document coexistence; migrate consumers later
- Beautora POS business logic in the main SaaS app
- Cloud product code (Phase 12)

---

## 6. Dependencies

### 6.1 Current NuGet / framework

- `net8.0-windows`
- `Microsoft.Extensions.Hosting.WindowsServices`
- `System.Drawing.Common`
- `UseWindowsForms` (tray)
- xUnit test stack

### 6.2 Likely additions (later phases)

| Dependency | Phase | Purpose |
|------------|-------|---------|
| Microsoft.Data.Sqlite (or EF Core SQLite) | 10 | Device registry |
| ZKTeco Standalone SDK (native/COM/DLL) | 6–8 | Isolated in ZKTeco adapter only |
| Optional: System.IO.Ports | later | Serial transport |

**Do not** add ZKTeco packages to the SDK project.

### 6.3 External systems

| System | Role |
|--------|------|
| Windows printer spooler | Existing printers/drawers |
| ZKTeco device `192.168.1.201:4370` | First real TCP attendance terminal (PC `192.168.1.100`) |
| Beautora web origins | CORS consumers |
| SyncOps Cloud | Phase 12 |

---

## 7. Migration risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking `/api/printer|drawer|fingerprint` JSON | Beautora POS fails | Compatibility facades + contract tests mirroring `INTEGRATION.md` |
| Renaming namespaces too early | Compile breaks, installer drift | Keep `Beautora.DeviceAgent` type aliases / dual assemblies temporarily |
| Changing API key header name | Auth failures | Accept both headers |
| Aggressive TCP discovery | Network noise / false positives | Known-IP first; CIDR scan opt-in with limits |
| Coupling SDK to ZKTeco DLL | Contaminates platform | Adapter-only reference; `IZktecoProtocol` seam |
| Inventing ZK protocol | Unreliable hardware ops | Vendor SDK first; TODO for unknown ops |
| Tray talking to hardware via DI while Service also hosts | Dual ownership bugs | Phase 11: tray → local HTTP only |
| Global MockMode vs per-adapter mocks | Confusing test matrix | Keep global flag; add per-adapter mocks underneath |
| No `.sln` today | Awkward multi-project builds | Add solution in Phase 2 |
| Legacy Node agent coexistence | Two agents on same port | Document; do not auto-kill; coordinate port/config |

---

## 8. Recommended SDK shapes (informed by existing code)

Do **not** force a single mega-interface. Map current services to capabilities:

| Existing | Becomes |
|----------|---------|
| `IPrinterService.PrintAsync` | `IPrintableDevice.PrintAsync(PrintJob)` |
| `IPrinterService.GetPrintersAsync` | Printer discovery provider + registry |
| `IDrawerService.OpenAsync` | `ICashDrawerDevice.OpenAsync()` |
| `IFingerprintService.Scan/Verify` | `IFingerprintDevice` |
| New ZKTeco users/logs/time | `IAttendanceDevice` (+ later `IUserDirectoryDevice`) |
| `IDeviceManager` cache | Full SDK `IDeviceManager` + registry |
| Free-text failures | `DeviceException` + `DeviceErrorCode` |

Proposed error codes:

```text
DeviceNotFound, ConnectionFailed, AuthenticationFailed, Timeout,
UnsupportedOperation, ProtocolError, HardwareError, PermissionDenied, DeviceBusy
```

---

## 9. Phase 1 deliverable checklist

- [x] Inspected repository structure and source files
- [x] Identified current abstractions and composition
- [x] Identified reusable vs Beautora-coupled pieces
- [x] Identified breaking-change risks
- [x] Documented target architecture and phased plan
- [x] Listed files to create / change / preserve
- [x] Phases 2–12 implemented in platform bootstrap (SDK, adapters, ZKTeco mock/tcp-probe, generic API, registry, tray/service, cloud scaffold)

---

## 10. Implementation status (post Phase 1)

| Phase | Status |
|-------|--------|
| 2 SDK | Done — `SyncOps.DeviceSDK` |
| 3 Printer adapters | Done |
| 4 Cash drawer adapters | Done |
| 5 Fingerprint adapters | Done (mock) |
| 6–8 ZKTeco | Done with mock + tcp-probe; vendor-sdk placeholder |
| 9 Generic API | Done — legacy routes preserved |
| 10 Discovery + SQLite registry | Done |
| 11 Service/tray | Done — SyncOps branding; tray uses local HTTP discover |
| 12 Cloud | Scaffold only (`NullCloudDeviceChannel` / `HttpCloudDeviceChannel`) |

**Remaining hardware work:** link official ZKTeco Standalone SDK into `ZktecoVendorSdkProtocol`, then set `ProtocolMode=vendor-sdk`.
