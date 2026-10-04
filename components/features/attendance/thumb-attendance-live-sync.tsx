"use client";

import { useEffect, useRef } from "react";
import {
  connectDevice,
  discoverDevices,
  getAgentHealth,
  getDeviceAttendanceLogs,
  pickAttendanceTerminal,
} from "@/lib/devices/syncops-agent";
import { ingestThumbPunches } from "@/lib/actions/staff";
import { formatAttendanceMinutes } from "@/lib/attendance/duration";
import { notify } from "@/lib/toast";

export const THUMB_ATTENDANCE_EVENT = "salon-thumb-attendance";
/** Bumped key so older stuck watermarks do not skip new machine punches. */
export const THUMB_ATTENDANCE_WATERMARK_KEY = "salon-thumb-attendance-watermark-ms-v3";
const WATERMARK_KEY = THUMB_ATTENDANCE_WATERMARK_KEY;
const DEVICE_KEY = "salon-thumb-attendance-device-id-v3";
/** Poll often so a machine punch lands in the DB within ~2s without any UI click. */
const POLL_MS = 2000;

/**
 * Probes the local SyncOps Device Agent (127.0.0.1). Mount only on Attendance
 * (and similar device screens) — Chrome will ask for “apps on this device”
 * permission if this runs site-wide during onboarding/dashboard.
 *
 * Staff press thumb on the ZK machine: 1st → check-in, next → check-out.
 */
export function ThumbAttendanceLiveSync() {
  const busy = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function resolveTerminalId(): Promise<string | null> {
      const cached = sessionStorage.getItem(DEVICE_KEY)?.trim();
      if (cached && !cached.toLowerCase().includes("mock")) return cached;

      const discovered = await discoverDevices(true);
      const terminal = pickAttendanceTerminal(discovered.devices);
      if (!terminal) return null;
      sessionStorage.setItem(DEVICE_KEY, terminal.id);
      return terminal.id;
    }

    async function tick() {
      if (busy.current || cancelled) return;
      busy.current = true;
      try {
        await getAgentHealth();
        const deviceId = await resolveTerminalId();
        if (!deviceId) return;

        try {
          await connectDevice(deviceId);
        } catch {
          // Push-buffer devices don't need a live TCP session; continue to read store.
        }

        let logs: Awaited<ReturnType<typeof getDeviceAttendanceLogs>> = [];
        try {
          logs = await getDeviceAttendanceLogs(deviceId);
        } catch {
          sessionStorage.removeItem(DEVICE_KEY);
          return;
        }

        // First visit: only take punches from the last 2 minutes.
        if (localStorage.getItem(WATERMARK_KEY) == null) {
          localStorage.setItem(WATERMARK_KEY, String(Date.now() - 120_000));
        }

        let watermark = Number(localStorage.getItem(WATERMARK_KEY) || "0");
        const fresh = logs
          .map((l) => ({
            ...l,
            ms: new Date(l.timestamp).getTime(),
            thumbId: String(l.userId ?? "").trim(),
          }))
          .filter((l) => l.thumbId && !Number.isNaN(l.ms) && l.ms > watermark)
          .sort((a, b) => a.ms - b.ms);

        if (!fresh.length) return;

        const punches = fresh.map((l) => ({
          thumbId: l.thumbId,
          at: l.timestamp,
          action: "toggle" as const,
          externalKey: `${l.thumbId}@${l.ms}`,
        }));

        const result = await ingestThumbPunches(punches);
        let appliedAny = false;

        for (let i = 0; i < result.results.length; i++) {
          const row = result.results[i];
          const punchMs = fresh[i]?.ms;
          // Always advance watermark past attempted punches so one failure cannot block later ones.
          if (punchMs && punchMs > watermark) {
            watermark = punchMs;
            localStorage.setItem(WATERMARK_KEY, String(watermark));
          }

          if (!row.ok) {
            if (row.error && /not enrolled/i.test(row.error)) {
              notify.warning(`Thumb ID ${row.thumbId} not linked`, {
                description: "Register thumb for this staff on Attendance",
              });
            }
            continue;
          }
          if (row.deduped) continue;

          appliedAny = true;
          if (row.action === "check_in") {
            notify.success(`${row.staffName ?? "Staff"} checked in`, {
              description: "Thumb on machine · saved",
            });
          } else if (row.action === "check_out") {
            notify.success(`${row.staffName ?? "Staff"} checked out`, {
              description: `Thumb on machine · total ${formatAttendanceMinutes(row.durationMinutes ?? null)}`,
            });
          }
        }

        if (appliedAny && typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(THUMB_ATTENDANCE_EVENT));
        }
      } catch {
        // Agent offline or no permission — silent (user may not be on salon PC).
      } finally {
        busy.current = false;
      }
    }

    void tick();
    const timer = setInterval(() => void tick(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return null;
}
