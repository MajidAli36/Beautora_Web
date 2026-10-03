import type { SyncOpsDeviceInfo } from "@/lib/devices/syncops-agent";

export function formatSyncOpsDeviceType(type: string | number | undefined): string {
  if (type == null) return "Device";
  const raw = String(type);
  const n = Number(raw);
  if (!Number.isNaN(n)) {
    const byNum: Record<number, string> = {
      1: "Printer",
      2: "Cash drawer",
      3: "Fingerprint",
      4: "Attendance terminal",
      5: "RFID",
      6: "Barcode",
      7: "Scale",
    };
    if (byNum[n]) return byNum[n];
  }
  const lower = raw.toLowerCase();
  if (lower.includes("printer")) return "Printer";
  if (lower.includes("drawer")) return "Cash drawer";
  if (lower.includes("fingerprint")) return "Fingerprint";
  if (lower.includes("attendance")) return "Attendance terminal";
  return raw.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function formatSyncOpsConnectionState(
  state: string | number | undefined
): "connected" | "mock" | "disconnected" | "unknown" {
  if (state == null) return "unknown";
  const raw = String(state).toLowerCase();
  const n = Number(raw);
  if (n === 2 || raw.includes("connected")) return "connected";
  if (n === 4 || raw.includes("mock")) return "mock";
  if (n === 0 || raw.includes("disconnect")) return "disconnected";
  return "unknown";
}

export function syncOpsDeviceEndpoint(device: SyncOpsDeviceInfo): string {
  if (device.host && device.port) return `${device.host}:${device.port}`;
  if (device.host) return device.host;
  return "—";
}

export function isSdkDeviceLinked(
  state: ReturnType<typeof formatSyncOpsConnectionState>
): boolean {
  return state === "connected" || state === "mock";
}
