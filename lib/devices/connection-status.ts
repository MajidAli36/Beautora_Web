/** How recently a device last called the Beautora device API (poll, attendance, etc.). */

export type AppDeviceConnection = "live" | "idle" | "offline";

const LIVE_MS = 3 * 60 * 1000;
const IDLE_MS = 24 * 60 * 60 * 1000;

export function getAppDeviceConnection(lastSeenAt: string | null | undefined): AppDeviceConnection {
  if (!lastSeenAt) return "offline";
  const at = new Date(lastSeenAt).getTime();
  if (Number.isNaN(at)) return "offline";
  const age = Date.now() - at;
  if (age <= LIVE_MS) return "live";
  if (age <= IDLE_MS) return "idle";
  return "offline";
}

export function appDeviceConnectionLabel(status: AppDeviceConnection): string {
  switch (status) {
    case "live":
      return "Connected";
    case "idle":
      return "Idle";
    default:
      return "Not connected";
  }
}
