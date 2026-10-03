"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  captureThumbForEnrollment,
  connectDevice,
  discoverDevices,
  getAgentHealth,
  getDeviceAttendanceLogs,
  pickAttendanceTerminal,
  type SyncOpsAgentHealth,
} from "@/lib/devices/syncops-agent";
import {
  enrollStaffThumb,
  ingestThumbPunches,
  recordManualAttendance,
  recordThumbAttendance,
  removeStaffThumb,
} from "@/lib/actions/staff";
import { attendanceMethodLabel } from "@/lib/attendance/labels";
import {
  THUMB_ATTENDANCE_EVENT,
  THUMB_ATTENDANCE_WATERMARK_KEY,
} from "@/components/features/attendance/thumb-attendance-live-sync";
import { notify } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Input } from "@/components/ui/input";
import { formatTime } from "@/lib/format";
import {
  Fingerprint,
  Loader2,
  LogIn,
  LogOut,
  Monitor,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

type StaffMember = {
  id: string;
  full_name: string;
  thumb_id: string | null;
  thumb_enrolled_at: string | null;
};

type OnDutyRow = {
  staffId: string;
  staffName: string;
  method: string;
  since: string;
};

type AttendanceDeskProps = {
  staff: StaffMember[];
  onDuty: OnDutyRow[];
  enrolledCount: number;
};

/**
 * Thumb attendance: link Machine User ID (textbox or capture), then press on ZK for in/out.
 */
export function AttendanceDesk({ staff, onDuty, enrolledCount }: AttendanceDeskProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [listeningStaffId, setListeningStaffId] = useState<string | null>(null);
  const [health, setHealth] = useState<SyncOpsAgentHealth | null>(null);
  /** Draft Machine User IDs typed per staff row */
  const [machineIdDraft, setMachineIdDraft] = useState<Record<string, string>>({});
  /** Avoid LastPass (and similar) injecting DOM before hydration. */
  const [controlsReady, setControlsReady] = useState(false);

  const onDutyById = useMemo(() => {
    const map = new Map<string, OnDutyRow>();
    for (const row of onDuty) map.set(row.staffId, row);
    return map;
  }, [onDuty]);

  const refreshAgent = useCallback(async () => {
    try {
      setHealth(await getAgentHealth());
    } catch {
      setHealth(null);
    }
  }, []);

  useEffect(() => {
    setControlsReady(true);
  }, []);

  useEffect(() => {
    void refreshAgent();
    const t = setInterval(() => void refreshAgent(), 15000);
    return () => clearInterval(t);
  }, [refreshAgent]);

  useEffect(() => {
    const onPunch = () => router.refresh();
    window.addEventListener(THUMB_ATTENDANCE_EVENT, onPunch);
    return () => window.removeEventListener(THUMB_ATTENDANCE_EVENT, onPunch);
  }, [router]);

  // Seed draft fields from saved thumb_ids
  useEffect(() => {
    setMachineIdDraft((prev) => {
      const next = { ...prev };
      for (const s of staff) {
        if (next[s.id] == null) next[s.id] = s.thumb_id ?? "";
      }
      return next;
    });
  }, [staff]);

  function run(
    key: string,
    work: () => Promise<{ error?: string; action?: string } | void>,
    successMsg: (result?: { action?: string }) => string
  ) {
    setBusyKey(key);
    startTransition(async () => {
      try {
        const result = await work();
        if (result && "error" in result && result.error) {
          notify.error(result.error);
          return;
        }
        notify.success(successMsg(result ?? undefined));
        router.refresh();
      } catch (e) {
        notify.error(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setBusyKey(null);
      }
    });
  }

  /** Primary reliable path: type the ZK User ID from the machine menu (e.g. 2). */
  function linkMachineId(s: StaffMember, rawId?: string) {
    const thumbId = (rawId ?? machineIdDraft[s.id] ?? "").trim();
    if (!thumbId) {
      notify.error("Enter the Machine User ID from the ZK (e.g. 2)");
      return;
    }
    if (/^web-/i.test(thumbId)) {
      notify.error("Use the real ZK User ID number — not a website ID");
      return;
    }
    run(
      `link-${s.id}`,
      async () => {
        const fd = new FormData();
        fd.set("staff_id", s.id);
        fd.set("thumb_id", thumbId);
        return enrollStaffThumb({}, fd);
      },
      () =>
        `${s.full_name} linked to Machine ID ${thumbId}. Press thumb on ZK for check-in / check-out.`
    );
  }

  /** Optional: try to read User ID from a fresh machine punch (5s). */
  function captureFromMachine(s: StaffMember) {
    if (!health) {
      notify.error("Start Device Agent on this PC, then try again — or type the User ID below");
      return;
    }
    setBusyKey(`enroll-${s.id}`);
    setListeningStaffId(s.id);
    notify.info(`Listening for ${s.full_name}`, {
      description: "Press thumb on ZK now (5s), or type User ID in the box and Link",
      duration: 5000,
    });
    startTransition(async () => {
      try {
        const used = staff
          .filter((x) => x.id !== s.id)
          .map((x) => x.thumb_id)
          .filter(Boolean) as string[];
        // Never invent mock IDs — that caused wrong Machine ID 1 vs real ZK user 2.
        const captured = await captureThumbForEnrollment({
          usedThumbIds: used,
          preferTerminal: true,
          skipMockFingerprint: true,
          allowMockCapture: false,
          listenMs: 5000,
        });

        setMachineIdDraft((prev) => ({ ...prev, [s.id]: captured.thumbId }));

        const fd = new FormData();
        fd.set("staff_id", s.id);
        fd.set("thumb_id", captured.thumbId);
        const result = await enrollStaffThumb({}, fd);
        if (result && "error" in result && result.error) {
          notify.error(result.error);
          return;
        }

        if (captured.punchedAtMs && typeof window !== "undefined") {
          const prev = Number(localStorage.getItem(THUMB_ATTENDANCE_WATERMARK_KEY) || "0");
          if (captured.punchedAtMs > prev) {
            localStorage.setItem(THUMB_ATTENDANCE_WATERMARK_KEY, String(captured.punchedAtMs));
          }
        }

        notify.success(`${s.full_name} linked to machine ID ${captured.thumbId}`, {
          description: "Confirm this matches User ID on the ZK menu",
        });
        router.refresh();
      } catch (e) {
        notify.warning(e instanceof Error ? e.message : "Could not read from machine", {
          description: "Type the ZK User ID in the box (e.g. 2) and click Link ID",
          duration: 8000,
        });
      } finally {
        setBusyKey(null);
        setListeningStaffId(null);
      }
    });
  }

  function manualIn(s: StaffMember) {
    run(`manual-in-${s.id}`, () => recordManualAttendance(s.id, "in"), () => `${s.full_name} — checked in (manual)`);
  }

  function manualOut(s: StaffMember) {
    run(`manual-out-${s.id}`, () => recordManualAttendance(s.id, "out"), () => `${s.full_name} — checked out (manual)`);
  }

  /**
   * Machine punch: listen briefly for realtime; if ZK says thank you but no
   * event arrives, still toggle using the linked Machine User ID.
   */
  function machinePunch(s: StaffMember) {
    if (!s.thumb_id) {
      notify.error("Link Machine User ID first (must match ZK User ID)");
      return;
    }
    const thumbId = s.thumb_id;
    const willCheckIn = !onDutyById.has(s.id);
    setBusyKey(`punch-${s.id}`);
    setListeningStaffId(s.id);
    notify.info(`Press thumb for ${s.full_name}`, {
      description: "On the ZK now (8s). If thank you appears, we will save even without realtime.",
      duration: 8000,
    });
    startTransition(async () => {
      try {
        let deviceId: string | null = null;
        try {
          if (health) {
            const discovered = await discoverDevices(true);
            deviceId = pickAttendanceTerminal(discovered.devices)?.id ?? null;
            if (deviceId) await connectDevice(deviceId);
          }
        } catch {
          /* continue — we can still save via linked ID */
        }

        const beforeKeys = new Set<string>();
        if (deviceId) {
          try {
            const before = await getDeviceAttendanceLogs(deviceId);
            for (const l of before) {
              beforeKeys.add(`${l.userId}@${new Date(l.timestamp).getTime()}`);
            }
          } catch {
            /* ignore */
          }
        }

        const deadline = Date.now() + 8000;
        let applied = false;
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 400));
          if (!deviceId) continue;
          try {
            const logs = await getDeviceAttendanceLogs(deviceId);
            const fresh = logs
              .map((l) => ({
                thumbId: String(l.userId ?? "").trim(),
                at: l.timestamp,
                ms: new Date(l.timestamp).getTime(),
              }))
              .filter(
                (l) =>
                  l.thumbId &&
                  !beforeKeys.has(`${l.thumbId}@${l.ms}`) &&
                  (l.thumbId === thumbId || l.thumbId === String(Number(thumbId)))
              )
              .sort((a, b) => a.ms - b.ms);
            if (fresh.length) {
              const hit = fresh[0];
              const result = await recordThumbAttendance(
                hit.thumbId,
                "toggle",
                hit.at,
                `${hit.thumbId}@${hit.ms}`
              );
              if (result.error) throw new Error(result.error);
              applied = true;
              notify.success(
                result.action === "check_out"
                  ? `${s.full_name} checked out (machine)`
                  : `${s.full_name} checked in (machine)`
              );
              break;
            }
          } catch {
            /* keep waiting */
          }
        }

        if (!applied) {
          // Realtime/buffer missed the punch — ZK often still shows "thank you".
          const result = await recordThumbAttendance(thumbId, "toggle");
          if (result.error) throw new Error(result.error);
          const action = result.action ?? (willCheckIn ? "check_in" : "check_out");
          notify.success(
            action === "check_out"
              ? `${s.full_name} checked out (linked ID ${thumbId})`
              : `${s.full_name} checked in (linked ID ${thumbId})`,
            {
              description:
                "Machine event was not received — saved using Linked ID. Keep agent running for auto sync.",
            }
          );
        }
        router.refresh();
      } catch (e) {
        notify.error(e instanceof Error ? e.message : "Punch failed");
      } finally {
        setBusyKey(null);
        setListeningStaffId(null);
      }
    });
  }

  function savePunchNow(s: StaffMember) {
    machinePunch(s);
  }

  function syncScanner() {
    run(
      "sync",
      async () => {
        if (!health) throw new Error("SDK offline — start Device Agent on this PC");
        const discovered = await discoverDevices(true);
        const terminal = pickAttendanceTerminal(discovered.devices);
        const deviceId = terminal?.id;
        if (!deviceId) throw new Error("No attendance terminal — open Devices and Connect first");
        await connectDevice(deviceId);
        const logs = await getDeviceAttendanceLogs(deviceId);
        const punches = [...logs]
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
          .map((log) => {
            const thumb = String(log.userId ?? "").trim();
            const ms = new Date(log.timestamp).getTime();
            return {
              thumbId: thumb,
              at: log.timestamp,
              action: "toggle" as const,
              externalKey: `${thumb}@${ms}`,
            };
          })
          .filter((p) => p.thumbId);

        const result = await ingestThumbPunches(punches);
        await refreshAgent();
        if (result.applied === 0 && result.skipped === 0) {
          return { error: "No punches found — link Machine User IDs that match the ZK" };
        }
        if (result.applied === 0) {
          return { error: "No new punches — already synced, or Machine ID does not match ZK User ID" };
        }
        return { action: `synced-${result.applied}` };
      },
      () => "Scanner punches synced to attendance"
    );
  }

  if (staff.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attendance</CardTitle>
          <CardDescription>Add staff first, then link each person’s ZK User ID.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const agentOnline = Boolean(health);

  return (
    <Card className="border-teal-500/20">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Thumb attendance</CardTitle>
            <CardDescription>
              Link each staff to their <strong>ZK User ID</strong> (must match the machine). Then{" "}
              <strong>1st thumb = check-in</strong>, <strong>next = check-out</strong>.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {enrolledCount}/{staff.length} thumbs
            </Badge>
            <Badge variant={agentOnline ? "default" : "outline"} className="gap-1">
              {agentOnline ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
              {agentOnline ? "Listening for machine" : "SDK offline"}
            </Badge>
            <Badge variant="outline">{onDuty.length} on duty</Badge>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground space-y-1">
          <p>
            <strong className="text-foreground">Recommended:</strong> On the ZK, open User list —
            note Saqib&apos;s User ID (e.g. <code className="text-foreground">2</code>) → type it
            below → <strong className="text-foreground">Link ID</strong>.
          </p>
          <p>
            If website Linked ID is <code className="text-foreground">1</code> but ZK User ID is{" "}
            <code className="text-foreground">2</code>, punches will not match — fix the ID in the
            box.
          </p>
          <p>
            For each punch: click <strong className="text-foreground">Punch (press thumb)</strong>,
            then press on the ZK. If the machine says thank you, a row is saved (even when realtime
            is flaky). Linked ID must match ZK User ID.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending || !agentOnline}
            onClick={syncScanner}
          >
            {busyKey === "sync" ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 size-3.5" />
            )}
            Sync scanner
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            render={<Link href="/kiosk/attendance" target="_blank" />}
          >
            <Monitor className="mr-1.5 size-3.5" />
            Kiosk
          </Button>
          <Button type="button" size="sm" variant="ghost" render={<Link href="/devices" />}>
            Devices →
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <ul className="divide-y rounded-lg border">
          {staff.map((s) => {
            const duty = onDutyById.get(s.id);
            const checkedIn = Boolean(duty);
            const enrollBusy = busyKey === `enroll-${s.id}`;
            const linkBusy = busyKey === `link-${s.id}`;
            const draft = machineIdDraft[s.id] ?? s.thumb_id ?? "";

            return (
              <li key={s.id} className="flex flex-col gap-3 px-3 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium truncate">{s.full_name}</p>
                      {checkedIn ? (
                        <Badge className="bg-teal-600 hover:bg-teal-600">Checked in</Badge>
                      ) : (
                        <Badge variant="outline">Checked out</Badge>
                      )}
                      {s.thumb_id ? (
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          Linked ID {s.thumb_id}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-700">
                          Not linked
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {checkedIn && duty ? (
                        <>
                          Since {formatTime(duty.since)} · {attendanceMethodLabel(duty.method)}
                          {s.thumb_id ? (
                            <> · next machine thumb → <strong>check-out</strong></>
                          ) : null}
                        </>
                      ) : s.thumb_id ? (
                        <>
                          Ready · press thumb on machine → <strong>check-in</strong>
                          {agentOnline ? " (listening)" : " — start Device Agent"}
                        </>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">
                          Type ZK User ID below (must match the machine), then Link ID
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {s.thumb_id ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={pending || (!!listeningStaffId && listeningStaffId !== s.id)}
                        onClick={() => machinePunch(s)}
                        title="Press thumb on ZK — saves even if realtime is missed"
                      >
                        {busyKey === `punch-${s.id}` || listeningStaffId === s.id ? (
                          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                        ) : (
                          <Fingerprint className="mr-1.5 size-3.5" />
                        )}
                        {listeningStaffId === s.id ? "Press thumb on ZK…" : "Punch (press thumb)"}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending || checkedIn}
                      onClick={() => manualIn(s)}
                      title="Manual backup check-in"
                    >
                      {busyKey === `manual-in-${s.id}` ? (
                        <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      ) : (
                        <LogIn className="mr-1.5 size-3.5" />
                      )}
                      Manual in
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending || !checkedIn}
                      onClick={() => manualOut(s)}
                      title="Manual backup check-out"
                    >
                      {busyKey === `manual-out-${s.id}` ? (
                        <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      ) : (
                        <LogOut className="mr-1.5 size-3.5" />
                      )}
                      Manual out
                    </Button>
                  </div>
                </div>

                {!controlsReady ? (
                  <div
                    className="h-12 rounded-md border bg-muted/20"
                    aria-hidden
                  />
                ) : (
                <form
                  className="flex flex-col gap-2 rounded-md border bg-muted/20 p-2 sm:flex-row sm:items-center"
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  onSubmit={(e) => {
                    e.preventDefault();
                    linkMachineId(s);
                  }}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <label
                      htmlFor={`zk-uid-${s.id}`}
                      className="shrink-0 text-xs text-muted-foreground whitespace-nowrap"
                    >
                      Machine User ID
                    </label>
                    <Input
                      id={`zk-uid-${s.id}`}
                      value={draft}
                      onChange={(e) =>
                        setMachineIdDraft((prev) => ({ ...prev, [s.id]: e.target.value }))
                      }
                      placeholder="e.g. 2"
                      className="h-8 max-w-[140px] font-mono"
                      inputMode="numeric"
                      disabled={pending}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      name={`zk-uid-${s.id}`}
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                    />
                    <Button type="submit" size="sm" disabled={pending || !draft.trim()}>
                      {linkBusy ? (
                        <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      ) : null}
                      {s.thumb_id ? "Update ID" : "Link ID"}
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending || (!!listeningStaffId && listeningStaffId !== s.id)}
                      onClick={() => captureFromMachine(s)}
                      title="Optional: try to read ID from a thumb press"
                    >
                      {enrollBusy || listeningStaffId === s.id ? (
                        <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      ) : (
                        <Fingerprint className="mr-1.5 size-3.5" />
                      )}
                      {listeningStaffId === s.id ? "Listening 5s…" : "Capture from machine"}
                    </Button>
                    {s.thumb_id ? (
                      <ConfirmAction
                        title="Remove thumb link?"
                        description={`Remove Machine ID for ${s.full_name}?`}
                        confirmLabel="Remove"
                        pendingLabel="Removing…"
                        variant="ghost"
                        onConfirm={async () => removeStaffThumb(s.id)}
                        successMessage="Thumb link removed."
                      >
                        <span className="text-xs">Remove</span>
                      </ConfirmAction>
                    ) : null}
                  </div>
                </form>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
