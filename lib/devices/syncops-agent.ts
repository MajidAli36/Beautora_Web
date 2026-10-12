/**
 * Browser client for the local SyncOps / Beautora Device Agent (Windows).
 * Runs on the salon PC only — agent listens on loopback http://127.0.0.1:17890
 *
 * Agent API key is fixed to match DeviceAgent:ApiKey in appsettings — not shown in UI.
 */

export const SYNCOPS_AGENT_DEFAULT_URL = "http://127.0.0.1:17890";
/** Must match device_agent DeviceAgent:ApiKey — not displayed in the UI. */
export const SYNCOPS_AGENT_API_KEY = "SyncOps@12345";
export const SYNCOPS_AGENT_URL_STORAGE = "salon-syncops-agent-url";
/** Legacy key storage — cleared so old wrong keys don't break login. */
const LEGACY_AGENT_KEY_STORAGE = "salon-syncops-agent-key";

export type SyncOpsAgentHealth = {
  status: string;
  agentVersion: string;
  mockMode?: boolean;
  timestamp?: string;
};

export type SyncOpsDeviceInfo = {
  id: string;
  type: string | number;
  name: string;
  manufacturer?: string;
  model?: string;
  status?: string | number;
  connectionState?: string | number;
  host?: string | null;
  port?: number | null;
  adapterId?: string | null;
  capabilities?: Array<{ kind: string | number; name?: string; isSupported?: boolean }>;
};

export type BeautoraAttendanceBridgeStatus = {
  configured: boolean;
  syncEnabled: boolean;
  appUrl: string;
  activeDeviceId?: string | null;
  lastSyncUtc?: string | null;
  watermarkUtc?: string | null;
  lastPushedCount?: number;
  lastError?: string | null;
  lastResult?: string | null;
};

export type AttendanceSyncResult = {
  success: boolean;
  message: string;
  deviceId?: string;
  fetched?: number;
  pushed?: number;
  deduped?: number;
  failed?: number;
  results?: unknown[];
};

export type BeautoraPunchApiResult = {
  success: boolean;
  ok?: boolean;
  action?: "check_in" | "check_out";
  staffName?: string;
  staffId?: string;
  at?: string;
  deduped?: boolean;
  error?: string;
  message?: string;
};

export type DeviceUser = {
  userId: string;
  name?: string | null;
  enabled?: boolean;
};

function readStorage(key: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(key)?.trim() || fallback;
}

export function getSyncOpsAgentConfig() {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(LEGACY_AGENT_KEY_STORAGE);
    } catch {
      /* ignore */
    }
  }
  return {
    baseUrl: readStorage(SYNCOPS_AGENT_URL_STORAGE, SYNCOPS_AGENT_DEFAULT_URL).replace(/\/$/, ""),
    apiKey: SYNCOPS_AGENT_API_KEY,
  };
}

export function saveSyncOpsAgentConfig(input: { baseUrl?: string }) {
  if (typeof window === "undefined") return;
  if (input.baseUrl != null) {
    localStorage.setItem(SYNCOPS_AGENT_URL_STORAGE, input.baseUrl.trim().replace(/\/$/, ""));
  }
}

async function agentFetch<T>(
  path: string,
  init?: RequestInit & { apiKey?: string; baseUrl?: string }
): Promise<T> {
  const cfg = getSyncOpsAgentConfig();
  const baseUrl = (init?.baseUrl ?? cfg.baseUrl).replace(/\/$/, "");
  const apiKey = init?.apiKey ?? cfg.apiKey;
  const { apiKey: _a, baseUrl: _b, ...rest } = init ?? {};

  const headers = new Headers(rest.headers);
  if (!headers.has("X-Beautora-Agent-Key") && !headers.has("X-SyncOps-Agent-Key")) {
    headers.set("X-Beautora-Agent-Key", apiKey);
  }
  if (rest.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      ...rest,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "SyncOps Device Agent is offline. Start it with: cd device_agent/src/Beautora.DeviceAgent && dotnet run"
    );
  }

  const body = (await res.json().catch(() => ({}))) as T & {
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(body.error || body.message || `Agent error (${res.status})`);
  }
  return body as T;
}

export async function getAgentHealth() {
  const cfg = getSyncOpsAgentConfig();
  try {
    const res = await fetch(`${cfg.baseUrl}/api/health`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Health check failed (${res.status})`);
    return (await res.json()) as SyncOpsAgentHealth;
  } catch {
    throw new Error("SyncOps Device Agent is offline on this PC.");
  }
}

export type ZktecoWaitPunch = {
  userId: string;
  timestamp: string;
  inOutMode?: number | null;
  deviceId?: string | null;
};

export type ZktecoWaitResult = {
  ok: boolean;
  version: number;
  changed: boolean;
  punches: ZktecoWaitPunch[];
};

/** Long-poll until a new ADMS/local punch arrives (or timeout ~25s). */
export async function waitForZktecoPunch(sinceVersion = 0, signal?: AbortSignal) {
  return agentFetch<ZktecoWaitResult>(`/api/zkteco/wait?since=${encodeURIComponent(String(sinceVersion))}`, {
    signal,
  });
}

export async function getBeautoraAttendanceStatus() {
  return agentFetch<BeautoraAttendanceBridgeStatus>("/api/beautora/attendance/status");
}

export async function syncBeautoraAttendance() {
  return agentFetch<AttendanceSyncResult>("/api/beautora/attendance/sync", { method: "POST" });
}

export async function punchBeautoraAttendance(input: {
  thumbId: string;
  action?: "toggle" | "check_in" | "check_out";
  at?: string;
}) {
  return agentFetch<BeautoraPunchApiResult>("/api/beautora/attendance/punch", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function discoverDevices(includeMocks = true) {
  return agentFetch<{ success: boolean; count: number; devices: SyncOpsDeviceInfo[] }>(
    "/api/devices/discover",
    {
      method: "POST",
      body: JSON.stringify({ includeMocks }),
    }
  );
}

/** Cached device list from the agent (legacy + SyncOps registry). */
export async function listAgentDevices() {
  return agentFetch<{
    agent: { version: string; status: string; mockMode?: boolean };
    devices: Array<{
      id: string;
      type: string;
      name: string;
      status?: string;
    }>;
  }>("/api/devices");
}

export async function getAgentDeviceStatus(deviceId: string) {
  return agentFetch<{
    deviceId: string;
    onlineStatus?: string | number;
    connectionState?: string | number;
    state?: string;
    message?: string;
  }>(`/api/devices/${encodeURIComponent(deviceId)}/status`);
}

export async function connectDevice(deviceId: string) {
  return agentFetch<{ success: boolean; message: string }>(`/api/devices/${encodeURIComponent(deviceId)}/connect`, {
    method: "POST",
    body: "{}",
  });
}

export async function disconnectDevice(deviceId: string) {
  return agentFetch<{ success: boolean; message: string }>(
    `/api/devices/${encodeURIComponent(deviceId)}/disconnect`,
    {
      method: "POST",
      body: "{}",
    }
  );
}

export async function getDeviceUsers(deviceId: string) {
  return agentFetch<DeviceUser[]>(`/api/devices/${encodeURIComponent(deviceId)}/users`);
}

export async function getDeviceAttendanceLogs(deviceId: string) {
  const body = await agentFetch<
    | Array<{ userId: string; timestamp: string; verifyMode?: number; inOutMode?: number }>
    | { value?: Array<{ userId: string; timestamp: string; verifyMode?: number; inOutMode?: number }> }
  >(`/api/devices/${encodeURIComponent(deviceId)}/attendance`);
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object" && Array.isArray(body.value)) return body.value;
  return [];
}

/** Prefer a real LAN ZK terminal over the in-memory mock. */
export function pickAttendanceTerminal(devices: SyncOpsDeviceInfo[]): SyncOpsDeviceInfo | undefined {
  const terminals = devices.filter(isAttendanceTerminal);
  return (
    terminals.find((d) => !d.id.toLowerCase().includes("mock")) ??
    terminals[0]
  );
}

export async function simulateTerminalPunch(input: {
  deviceId: string;
  userId: string;
  inOutMode?: number | null;
  pushToBeautora?: boolean;
}) {
  return agentFetch<{
    success: boolean;
    log?: { userId: string; timestamp: string; inOutMode?: number | null };
    beautora?: BeautoraPunchApiResult & { error?: string };
  }>(`/api/devices/${encodeURIComponent(input.deviceId)}/attendance/simulate-punch`, {
    method: "POST",
    body: JSON.stringify({
      userId: input.userId,
      inOutMode: input.inOutMode ?? null,
      pushToBeautora: input.pushToBeautora ?? true,
    }),
  });
}

export function isAttendanceTerminal(device: SyncOpsDeviceInfo) {
  const type = String(device.type).toLowerCase();
  // SyncOps enums serialize as numbers by default: AttendanceTerminal = 4
  if (type.includes("attendance") || type === "4") return true;
  return (device.capabilities ?? []).some((c) => {
    const kind = String(c.kind).toLowerCase();
    return kind.includes("attendance") || kind === "5";
  });
}

export function isFingerprintReader(device: SyncOpsDeviceInfo) {
  const type = String(device.type).toLowerCase();
  if (type.includes("fingerprint") || type === "3") return true;
  return (device.capabilities ?? []).some((c) => {
    const kind = String(c.kind).toLowerCase();
    return kind.includes("fingerprint") || kind === "3" || kind === "4";
  });
}

/** Legacy fingerprint scan — returns scanner template / user id for enrollment. */
export async function scanFingerprint(deviceId: string) {
  return agentFetch<{
    success: boolean;
    message?: string;
    templateId?: string;
  }>(`/api/fingerprint/${encodeURIComponent(deviceId)}/scan`, {
    method: "POST",
  });
}

export async function listFingerprintDevices() {
  return agentFetch<
    Array<{ id: string; name: string; vendor?: string; isConnected?: boolean; isMock?: boolean }>
  >("/api/fingerprint/list");
}

export type CapturedThumb = {
  thumbId: string;
  source: "fingerprint" | "terminal";
  /** Punch time on device — used so enroll punch is not also treated as check-in. */
  punchedAtMs?: number;
  deviceId?: string;
};

/**
 * Capture the real machine user ID for staff enrollment.
 * Always waits for a successful punch on the attendance terminal (or mock simulate).
 * Never invents website-only IDs — those break live thumb attendance.
 */
export async function captureThumbForEnrollment(options?: {
  usedThumbIds?: string[];
  listenMs?: number;
  /** Prefer attendance terminal punch over USB fingerprint reader. */
  preferTerminal?: boolean;
  /** Skip mock fingerprint reader (avoids fake IDs when using a real ZK box). */
  skipMockFingerprint?: boolean;
  /**
   * Only for mock terminals: invent the next free numeric user id + simulate punch.
   * Real ZK devices always require a physical thumb press — never a website-made ID.
   */
  allowMockCapture?: boolean;
}): Promise<CapturedThumb> {
  const used = new Set((options?.usedThumbIds ?? []).map((x) => x.trim()).filter(Boolean));
  const listenMs = options?.listenMs ?? 5000;
  const preferTerminal = options?.preferTerminal !== false;

  const tryFingerprint = async (): Promise<CapturedThumb | null> => {
    let readers = await listFingerprintDevices();
    if (!readers.length) {
      const discovered = await discoverDevices(true);
      readers = discovered.devices
        .filter(isFingerprintReader)
        .map((d) => ({ id: d.id, name: d.name, isMock: d.id.includes("mock") }));
    }
    if (options?.skipMockFingerprint) {
      readers = readers.filter((r) => !r.isMock && !r.id.toLowerCase().includes("mock"));
    }
    const reader = readers[0];
    if (!reader) return null;
    const scan = await scanFingerprint(reader.id);
    if (scan.success && scan.templateId?.trim()) {
      const thumbId = scan.templateId.trim();
      if (thumbId.toLowerCase().startsWith("web-")) return null;
      return { thumbId, source: "fingerprint" };
    }
    return null;
  };

  if (!preferTerminal && options?.allowMockCapture) {
    try {
      const fp = await tryFingerprint();
      if (fp) return fp;
    } catch {
      /* fall through to terminal */
    }
  }

  const discovered = await discoverDevices(true);
  const terminal = pickAttendanceTerminal(discovered.devices);
  if (!terminal) {
    throw new Error(
      "No attendance terminal found. Open Devices, connect the ZK / fingerprint machine, then try again."
    );
  }
  await connectDevice(terminal.id);

  const isMock =
    terminal.id.toLowerCase().includes("mock") ||
    String(terminal.status).toLowerCase().includes("mock") ||
    String(terminal.connectionState).toLowerCase().includes("mock");

  // Never invent website IDs. Mock auto-assign only when explicitly allowed (lab).
  // Real terminals always wait for a physical thumb press — or user types ID in the UI.
  if (isMock && options?.allowMockCapture) {
    let nextId = 1;
    while (used.has(String(nextId))) nextId++;
    const userId = String(nextId);
    const sim = await simulateTerminalPunch({
      deviceId: terminal.id,
      userId,
      pushToBeautora: false,
    });
    const punchedAtMs = sim.log?.timestamp
      ? new Date(sim.log.timestamp).getTime()
      : Date.now();
    return { thumbId: userId, source: "terminal", punchedAtMs, deviceId: terminal.id };
  }

  if (isMock && !options?.allowMockCapture) {
    throw new Error(
      "Only a mock terminal is available. Type the real ZK User ID in the Machine User ID box and click Link ID."
    );
  }

  // Real machine: wait for the next successful punch and read its User ID.
  // ZK often shows "duplicate punch" and does NOT write a new log if they
  // already punched recently — so we also accept a recent existing log.
  const before = await getDeviceAttendanceLogs(terminal.id);
  const beforeKeys = new Set(
    before.map((l) => `${l.userId}@${new Date(l.timestamp).getTime()}`)
  );
  const enrollStartedMs = Date.now();
  const RECENT_MS = 15 * 60 * 1000; // duplicate-punch window on many ZK units

  const pickFromLogs = (
    logs: Array<{ userId: string; timestamp: string }>,
    opts?: { onlyFresh?: boolean }
  ): CapturedThumb | null => {
    const ranked = logs
      .map((l) => ({
        thumbId: String(l.userId ?? "").trim(),
        punchedAtMs: new Date(l.timestamp).getTime(),
      }))
      .filter((l) => l.thumbId && !Number.isNaN(l.punchedAtMs) && !used.has(l.thumbId))
      .sort((a, b) => b.punchedAtMs - a.punchedAtMs);

    for (const hit of ranked) {
      if (opts?.onlyFresh) {
        const key = `${hit.thumbId}@${hit.punchedAtMs}`;
        if (beforeKeys.has(key)) continue;
        if (hit.punchedAtMs < enrollStartedMs - 2000) continue;
      } else {
        // Recent punch (covers ZK "duplicate punch" — finger OK, no new log row).
        if (hit.punchedAtMs < enrollStartedMs - RECENT_MS) continue;
      }
      return {
        thumbId: hit.thumbId,
        source: "terminal",
        punchedAtMs: hit.punchedAtMs,
        deviceId: terminal.id,
      };
    }
    return null;
  };

  const pollEvery = Math.min(500, Math.max(250, Math.floor(listenMs / 8)));
  const started = Date.now();
  while (Date.now() - started < listenMs) {
    await new Promise((r) => setTimeout(r, pollEvery));
    const logs = await getDeviceAttendanceLogs(terminal.id);
    const fresh = pickFromLogs(logs, { onlyFresh: true });
    if (fresh) return fresh;
  }

  // No brand-new log (typical when machine says "duplicate punch").
  // Use the newest punch from the last 15 minutes for an unused machine ID.
  const latest = await getDeviceAttendanceLogs(terminal.id);
  const recent = pickFromLogs(latest, { onlyFresh: false });
  if (recent) return recent;

  throw new Error(
    "No thumb ID from the machine. If ZK shows “duplicate punch”, wait 1–2 minutes then Register again and press once — or clear Duplicate Punch Period in the machine menu. Finger must already be enrolled on the ZK."
  );
}
