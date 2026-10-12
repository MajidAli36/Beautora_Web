"use client";

import { useEffect, useRef } from "react";
import {
  connectDevice,
  discoverDevices,
  getAgentHealth,
  getDeviceAttendanceLogs,
  pickAttendanceTerminal,
  waitForZktecoPunch,
} from "@/lib/devices/syncops-agent";
import { ingestThumbPunches } from "@/lib/actions/staff";
import { formatAttendanceMinutes } from "@/lib/attendance/duration";
import { notify } from "@/lib/toast";

export const THUMB_ATTENDANCE_EVENT = "salon-thumb-attendance";
/** Bumped key so older stuck watermarks do not skip new machine punches. */
export const THUMB_ATTENDANCE_WATERMARK_KEY = "salon-thumb-attendance-watermark-ms-v3";
const WATERMARK_KEY = THUMB_ATTENDANCE_WATERMARK_KEY;
const DEVICE_KEY = "salon-thumb-attendance-device-id-v3";
const VERSION_KEY = "salon-thumb-attendance-agent-version-v1";

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const t = window.setTimeout(() => resolve(), ms);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });
}

async function waitUntilVisible(signal: AbortSignal) {
  if (document.visibilityState === "visible") return;
  await new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const onVis = () => {
      if (document.visibilityState === "visible") {
        cleanup();
        resolve();
      }
    };
    const onAbort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };
    const cleanup = () => {
      document.removeEventListener("visibilitychange", onVis);
      signal.removeEventListener("abort", onAbort);
    };
    document.addEventListener("visibilitychange", onVis);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Realtime thumb sync (Attendance page only):
 * Long-poll agent while tab is visible; pause when hidden to save CPU/network.
 */
export function ThumbAttendanceLiveSync() {
  const ingestBusy = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const abort = new AbortController();

    async function resolveTerminalId(): Promise<string | null> {
      const cached = sessionStorage.getItem(DEVICE_KEY)?.trim();
      if (cached && !cached.toLowerCase().includes("mock")) return cached;

      const discovered = await discoverDevices(true);
      const terminal = pickAttendanceTerminal(discovered.devices);
      if (!terminal) return null;
      sessionStorage.setItem(DEVICE_KEY, terminal.id);
      return terminal.id;
    }

    async function applyPunches(
      punches: Array<{ thumbId: string; at: string; ms: number }>
    ) {
      if (!punches.length || ingestBusy.current || cancelled) return;
      ingestBusy.current = true;
      try {
        if (localStorage.getItem(WATERMARK_KEY) == null) {
          localStorage.setItem(WATERMARK_KEY, String(Date.now() - 120_000));
        }

        let watermark = Number(localStorage.getItem(WATERMARK_KEY) || "0");
        const fresh = punches
          .filter((p) => p.thumbId && !Number.isNaN(p.ms) && p.ms > watermark)
          .sort((a, b) => a.ms - b.ms);
        if (!fresh.length) {
          if (punches.length > 0 && typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent(THUMB_ATTENDANCE_EVENT));
          }
          return;
        }

        const result = await ingestThumbPunches(
          fresh.map((l) => ({
            thumbId: l.thumbId,
            at: l.at,
            action: "toggle" as const,
            externalKey: `${l.thumbId}@${l.ms}`,
          }))
        );

        let appliedAny = false;
        for (let i = 0; i < result.results.length; i++) {
          const row = result.results[i];
          const punchMs = fresh[i]?.ms;
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

        if ((appliedAny || fresh.length > 0) && typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(THUMB_ATTENDANCE_EVENT));
        }
      } finally {
        ingestBusy.current = false;
      }
    }

    async function fallbackTick() {
      if (cancelled || document.visibilityState !== "visible") return;
      try {
        await getAgentHealth();
        const deviceId = await resolveTerminalId();
        if (!deviceId) return;
        try {
          await connectDevice(deviceId);
        } catch {
          /* push-buffer ok */
        }
        const logs = await getDeviceAttendanceLogs(deviceId);
        await applyPunches(
          logs.map((l) => {
            const ms = new Date(l.timestamp).getTime();
            return {
              thumbId: String(l.userId ?? "").trim(),
              at: l.timestamp,
              ms,
            };
          })
        );
      } catch {
        /* agent offline */
      }
    }

    async function waitLoop() {
      let since = Number(sessionStorage.getItem(VERSION_KEY) || "0");
      while (!cancelled) {
        try {
          await waitUntilVisible(abort.signal);
          if (cancelled) break;

          const res = await waitForZktecoPunch(since, abort.signal);
          since = res.version;
          sessionStorage.setItem(VERSION_KEY, String(since));
          if (!res.changed) continue;
          if (document.visibilityState !== "visible") continue;

          window.dispatchEvent(new CustomEvent(THUMB_ATTENDANCE_EVENT));

          const punches = (res.punches ?? []).map((p) => {
            const ms = new Date(p.timestamp).getTime();
            return {
              thumbId: String(p.userId ?? "").trim(),
              at: p.timestamp,
              ms,
            };
          });
          await applyPunches(punches);
          await sleep(150, abort.signal);
          window.dispatchEvent(new CustomEvent(THUMB_ATTENDANCE_EVENT));
        } catch {
          if (cancelled) break;
          try {
            await sleep(1000, abort.signal);
          } catch {
            break;
          }
          if (document.visibilityState === "visible") {
            await fallbackTick();
          }
        }
      }
    }

    void fallbackTick();
    void waitLoop();
    const fallbackTimer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void fallbackTick();
    }, 15000);

    return () => {
      cancelled = true;
      abort.abort();
      clearInterval(fallbackTimer);
    };
  }, []);

  return null;
}
