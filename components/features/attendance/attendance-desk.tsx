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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Input } from "@/components/ui/input";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
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
 * Thumb attendance: link Machine User ID, punch, and manual backup.
 */
export function AttendanceDesk({ staff, onDuty, enrolledCount }: AttendanceDeskProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [listeningStaffId, setListeningStaffId] = useState<string | null>(null);
  const [health, setHealth] = useState<SyncOpsAgentHealth | null>(null);
  const [machineIdDraft, setMachineIdDraft] = useState<Record<string, string>>({});
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
    const t = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refreshAgent();
    }, 20000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshAgent();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshAgent]);

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
      () => `${s.full_name} linked to Machine ID ${thumbId}`
    );
  }

  function captureFromMachine(s: StaffMember) {
    if (!health) {
      notify.error("Start Device Agent on this PC, then try again — or type the User ID below");
      return;
    }
    setBusyKey(`enroll-${s.id}`);
    setListeningStaffId(s.id);
    notify.info(`Listening for ${s.full_name}`, {
      description: "Press thumb on ZK now (5s), or type User ID and Update ID",
      duration: 5000,
    });
    startTransition(async () => {
      try {
        const used = staff
          .filter((x) => x.id !== s.id)
          .map((x) => x.thumb_id)
          .filter(Boolean) as string[];
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

        notify.success(`${s.full_name} linked to machine ID ${captured.thumbId}`);
        router.refresh();
      } catch (e) {
        notify.warning(e instanceof Error ? e.message : "Could not read from machine", {
          description: "Type the ZK User ID and click Update ID",
          duration: 8000,
        });
      } finally {
        setBusyKey(null);
        setListeningStaffId(null);
      }
    });
  }

  function manualIn(s: StaffMember) {
    run(`manual-in-${s.id}`, () => recordManualAttendance(s.id, "in"), () => `${s.full_name} — checked in`);
  }

  function manualOut(s: StaffMember) {
    run(`manual-out-${s.id}`, () => recordManualAttendance(s.id, "out"), () => `${s.full_name} — checked out`);
  }

  function machinePunch(s: StaffMember) {
    if (!s.thumb_id) {
      notify.error("Link Machine User ID first");
      return;
    }
    const thumbId = s.thumb_id.trim();
    const willCheckIn = !onDutyById.has(s.id);
    setBusyKey(`punch-${s.id}`);
    startTransition(async () => {
      try {
        const at = new Date().toISOString();
        const externalKey = `${thumbId}@${Date.now()}`;
        const result = await recordThumbAttendance(thumbId, "toggle", at, externalKey);
        if (result.error) throw new Error(result.error);

        const action = result.action ?? (willCheckIn ? "check_in" : "check_out");
        notify.success(
          action === "check_out"
            ? `${s.full_name} checked out`
            : `${s.full_name} checked in`
        );

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(THUMB_ATTENDANCE_EVENT));
        }
        router.refresh();
      } catch (e) {
        notify.error(e instanceof Error ? e.message : "Punch failed");
      } finally {
        setBusyKey(null);
      }
    });
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
      <Card className="rounded-2xl border-[#E5E7EB] shadow-none">
        <CardHeader>
          <CardTitle className="text-base text-[#172033]">Thumb Attendance</CardTitle>
          <p className="text-sm text-muted-foreground">Add staff first, then link each ZK User ID.</p>
        </CardHeader>
      </Card>
    );
  }

  const agentOnline = Boolean(health);

  return (
    <Card className="rounded-2xl border-[#E5E7EB] bg-white shadow-none">
      <CardHeader className="space-y-3 pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base text-[#172033]">Thumb Attendance</CardTitle>
              <p className="text-sm text-muted-foreground">
                Punch or scan to check staff in and out.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold whitespace-nowrap",
                  agentOnline
                    ? "border-teal-200 bg-teal-50 text-teal-800"
                    : "border-amber-200 bg-amber-50 text-amber-900"
                )}
                title={
                  agentOnline
                    ? "SyncOps Device Agent is reachable on this PC"
                    : "Start Device Agent on this PC for live ZK sync"
                }
              >
                {agentOnline ? (
                  <Wifi className="size-3.5 shrink-0" />
                ) : (
                  <WifiOff className="size-3.5 shrink-0" />
                )}
                {agentOnline ? "Machine online" : "Agent offline"}
              </span>
              <span className="inline-flex h-8 items-center rounded-full border border-[#E5E7EB] bg-[#F8FAFC] px-3 text-xs font-semibold tabular-nums text-[#172033] whitespace-nowrap">
                {enrolledCount}/{staff.length} linked
              </span>
              <span className="inline-flex h-8 items-center rounded-full border border-[#E5E7EB] bg-white px-3 text-xs font-semibold tabular-nums text-[#172033] whitespace-nowrap">
                {onDuty.length} on duty
              </span>
            </div>
          </div>

          {!agentOnline ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Device Agent is offline. Start it on this PC for live ZK sync, or use Punch / Manual
              actions.
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="h-8 bg-[#0FA99A] hover:bg-[#0d9689]"
              disabled={pending || !agentOnline}
              onClick={syncScanner}
            >
              {busyKey === "sync" ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 size-3.5" />
              )}
              Sync Scanner
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              render={<Link href="/kiosk/attendance" target="_blank" />}
            >
              <Monitor className="mr-1.5 size-3.5" />
              Kiosk
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8"
              render={<Link href="/devices" />}
            >
              Devices
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <ul className="divide-y divide-[#E5E7EB] rounded-xl border border-[#E5E7EB] overflow-hidden">
            {staff.map((s) => {
              const duty = onDutyById.get(s.id);
              const checkedIn = Boolean(duty);
              const enrollBusy = busyKey === `enroll-${s.id}`;
              const linkBusy = busyKey === `link-${s.id}`;
              const punchBusy = busyKey === `punch-${s.id}`;
              const draft = machineIdDraft[s.id] ?? s.thumb_id ?? "";

              return (
                <li key={s.id} className="bg-white px-3 py-3 sm:px-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-[#172033]">{s.full_name}</p>
                        {checkedIn ? (
                          <Badge className="bg-teal-600 hover:bg-teal-600 font-normal">
                            Checked in
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="font-normal">
                            Checked out
                          </Badge>
                        )}
                        {s.thumb_id ? (
                          <Badge variant="secondary" className="font-mono text-[10px] font-normal">
                            ID {s.thumb_id}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-amber-300 text-amber-700 font-normal"
                          >
                            Not linked
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {checkedIn && duty ? (
                          <>
                            Since {formatTime(duty.since)} · {attendanceMethodLabel(duty.method)}
                          </>
                        ) : s.thumb_id ? (
                          <>Ready for check-in{agentOnline ? " · listening" : ""}</>
                        ) : (
                          <span className="text-amber-700">Link Machine User ID to enable Punch</span>
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {s.thumb_id ? (
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 bg-[#0FA99A] hover:bg-[#0d9689]"
                          disabled={pending || punchBusy}
                          onClick={() => machinePunch(s)}
                          title="Instant check-in / check-out via web API"
                        >
                          {punchBusy ? (
                            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                          ) : (
                            <Fingerprint className="mr-1.5 size-3.5" />
                          )}
                          {punchBusy ? "Saving…" : "Punch"}
                        </Button>
                      ) : null}

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8"
                        disabled={pending || checkedIn}
                        onClick={() => manualIn(s)}
                        title="Backup check-in"
                      >
                        {busyKey === `manual-in-${s.id}` ? (
                          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                        ) : (
                          <LogIn className="mr-1.5 size-3.5" />
                        )}
                        Manual In
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        disabled={pending || !checkedIn}
                        onClick={() => manualOut(s)}
                        title="Backup check-out"
                      >
                        {busyKey === `manual-out-${s.id}` ? (
                          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                        ) : (
                          <LogOut className="mr-1.5 size-3.5" />
                        )}
                        Manual Out
                      </Button>
                    </div>
                  </div>

                  {!controlsReady ? (
                    <div className="mt-3 h-10 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC]" aria-hidden />
                  ) : (
                    <form
                      className="mt-3 flex flex-col gap-2 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-2 sm:flex-row sm:items-center"
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
                          className="h-8 max-w-[120px] rounded-lg border-[#E5E7EB] bg-white font-mono"
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
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          className="h-8"
                          disabled={pending || !draft.trim()}
                        >
                          {linkBusy ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
                          {s.thumb_id ? "Update ID" : "Link ID"}
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8"
                          disabled={pending || (!!listeningStaffId && listeningStaffId !== s.id)}
                          onClick={() => captureFromMachine(s)}
                        >
                          {enrollBusy || listeningStaffId === s.id ? (
                            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                          ) : (
                            <Fingerprint className="mr-1.5 size-3.5" />
                          )}
                          {listeningStaffId === s.id ? "Listening…" : "Capture from Machine"}
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
