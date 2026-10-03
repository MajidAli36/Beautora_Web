import type { SyncOpsDeviceInfo } from "@/lib/devices/syncops-agent";

/** Salon-relevant hardware only (no barcode/RFID/scale unless POS-related). */
const RELEVANT_TYPE_NUMBERS = new Set([1, 2, 3, 4]); // Printer, CashDrawer, Fingerprint, AttendanceTerminal

const RELEVANT_CAPABILITY_NUMBERS = new Set([1, 2, 3, 4, 5]); // Print, CashDrawer, Fingerprint*, Attendance

function typeNumber(type: string | number | undefined): number | null {
  if (type == null) return null;
  const n = Number(type);
  return Number.isNaN(n) ? null : n;
}

export function isRelevantSalonSdkDevice(device: SyncOpsDeviceInfo): boolean {
  const n = typeNumber(device.type);
  if (n != null && RELEVANT_TYPE_NUMBERS.has(n)) return true;

  const id = (device.id ?? "").toLowerCase();
  const name = (device.name ?? "").toLowerCase();
  const adapter = (device.adapterId ?? "").toLowerCase();

  if (
    id.includes("printer") ||
    id.includes("drawer") ||
    id.includes("fingerprint") ||
    id.includes("zkteco") ||
    id.includes("attendance")
  ) {
    return true;
  }

  if (
    name.includes("printer") ||
    name.includes("drawer") ||
    name.includes("fingerprint") ||
    name.includes("zkteco") ||
    name.includes("attendance")
  ) {
    return true;
  }

  if (adapter.includes("printer") || adapter.includes("cashdrawer") || adapter.includes("fingerprint") || adapter.includes("zkteco")) {
    return true;
  }

  for (const cap of device.capabilities ?? []) {
    const kind = Number(cap.kind);
    if (!Number.isNaN(kind) && RELEVANT_CAPABILITY_NUMBERS.has(kind)) return true;
    const kindStr = String(cap.kind).toLowerCase();
    if (
      kindStr.includes("print") ||
      kindStr.includes("drawer") ||
      kindStr.includes("fingerprint") ||
      kindStr.includes("attendance")
    ) {
      return true;
    }
  }

  const typeStr = String(device.type).toLowerCase();
  return (
    typeStr.includes("printer") ||
    typeStr.includes("drawer") ||
    typeStr.includes("fingerprint") ||
    typeStr.includes("attendance")
  );
}

export function filterRelevantSalonSdkDevices(devices: SyncOpsDeviceInfo[]): SyncOpsDeviceInfo[] {
  return devices.filter(isRelevantSalonSdkDevice);
}
