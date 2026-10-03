"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  connectDevice,
  discoverDevices,
  getAgentHealth,
  getBeautoraAttendanceStatus,
  getDeviceAttendanceLogs,
  getDeviceUsers,
  getSyncOpsAgentConfig,
  isAttendanceTerminal,
  simulateTerminalPunch,
  type BeautoraAttendanceBridgeStatus,
  type DeviceUser,
  type SyncOpsAgentHealth,
  type SyncOpsDeviceInfo,
} from "@/lib/devices/syncops-agent";
import { recordThumbAttendance } from "@/lib/actions/staff";
import { notify } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Fingerprint,
  Loader2,
  PlugZap,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

type EnrolledStaff = {
  id: string;
  full_name: string;
  thumb_id: string | null;
};

type SyncOpsAttendancePanelProps = {
  enrolledStaff: EnrolledStaff[];
};

export function SyncOpsAttendancePanel({ enrolledStaff }: SyncOpsAttendancePanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [health, setHealth] = useState<SyncOpsAgentHealth | null>(null);
  const [bridge, setBridge] = useState<BeautoraAttendanceBridgeStatus | null>(null);
  const [devices, setDevices] = useState<SyncOpsDeviceInfo[]>([]);
  const [users, setUsers] = useState<DeviceUser[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [thumbId, setThumbId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const enrolledWithThumb = enrolledStaff.filter((s) => s.thumb_id);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const h = await getAgentHealth();
      setHealth(h);
      try {
        const status = await getBeautoraAttendanceStatus();
        setBridge(status);
      } catch (e) {
        setBridge(null);
        setError(e instanceof Error ? e.message : "Could not read Beautora bridge status");
      }
    } catch (e) {
      setHealth(null);
      setBridge(null);
      setError(e instanceof Error ? e.message : "Agent offline");
    }
  }, []);

  useEffect(() => {
    getSyncOpsAgentConfig();
    void refresh();
    const timer = setInterval(() => void refresh(), 10000);
    return () => clearInterval(timer);
  }, [refresh]);

  function runDiscover() {
    startTransition(async () => {
      try {
        const result = await discoverDevices(true);
        const terminals = result.devices.filter(isAttendanceTerminal);
        setDevices(terminals);
        const first = terminals[0]?.id ?? "";
        setSelectedDeviceId((prev) => prev || first);
        setLastMessage(`Found ${terminals.length} attendance terminal(s)`);
        notify.success("Devices discovered", {
          description: `${terminals.length} attendance terminal(s)`,
        });
        if (first) {
          await connectDevice(first);
          const list = await getDeviceUsers(first);
          setUsers(list);
        }
        await refresh();
      } catch (e) {
        notify.error(e instanceof Error ? e.message : "Discover failed");
      }
    });
  }

  function runSync() {
    startTransition(async () => {
      try {
        if (!selectedDeviceId) {
          const discovered = await discoverDevices(true);
          const terminals = discovered.devices.filter(isAttendanceTerminal);
          setDevices(terminals);
          const first = terminals[0]?.id;
          if (!first) throw new Error("No attendance terminal found — Discover terminal first");
          setSelectedDeviceId(first);
          await connectDevice(first);
          await syncFromDevice(first);
          return;
        }
        await syncFromDevice(selectedDeviceId);
      } catch (e) {
        notify.error(e instanceof Error ? e.message : "Sync failed");
      }
    });
  }

  async function syncFromDevice(deviceId: string) {
    await connectDevice(deviceId);
    const logs = await getDeviceAttendanceLogs(deviceId);
    const sorted = [...logs].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    let pushed = 0;
    let failed = 0;
    let lastOk = "";
    for (const log of sorted) {
      const thumb = String(log.userId ?? "").trim();
      if (!thumb) continue;
      const action =
        log.inOutMode === 0 ? "check_in" : log.inOutMode === 1 ? "check_out" : "toggle";
      const result = await recordThumbAttendance(thumb, action, log.timestamp);
      if (result.error) {
        failed++;
        continue;
      }
      pushed++;
      lastOk = `${result.action} → ${result.staffName}`;
    }
    setLastMessage(`synced ${pushed} punch(es)${failed ? `, ${failed} skipped` : ""}`);
    if (pushed > 0) {
      notify.success("Synced to attendance", { description: lastOk || `${pushed} records` });
      router.refresh();
    } else if (failed > 0) {
      notify.error("No punches applied — enroll thumb IDs to match device user IDs");
    } else {
      notify.success("Nothing new to sync");
    }
    await refresh();
  }

  function runThumbPunch(id: string) {
    const value = id.trim();
    if (!value) {
      notify.error("Enter or pick a thumb / scanner user ID");
      return;
    }
    startTransition(async () => {
      try {
        // Optional: write a mock punch onto the SDK device log (no Beautora bridge required).
        if (selectedDeviceId) {
          try {
            await simulateTerminalPunch({
              deviceId: selectedDeviceId,
              userId: value,
              pushToBeautora: false,
            });
          } catch {
            /* device simulate is optional */
          }
        }

        const result = await recordThumbAttendance(value, "toggle");
        if (result.error) throw new Error(result.error);

        notify.success(result.action === "check_out" ? "Checked out" : "Checked in", {
          description: result.staffName ?? value,
        });
        setLastMessage(`${result.action} → ${result.staffName ?? value}`);
        router.refresh();
        await refresh();
      } catch (e) {
        notify.error(e instanceof Error ? e.message : "Thumb punch failed");
      }
    });
  }

  const online = Boolean(health);

  return (
    <Card className="border-teal-500/25">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="size-5 text-teal-600" />
              SyncOps Device Agent (thumb + terminal)
            </CardTitle>
            <CardDescription>
              Connects <code className="text-xs">device_agent</code> to this screen. Punch thumb and
              sync use your logged-in session (no agent bridge key needed). Enroll each staff thumb
              ID below first.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={online ? "default" : "outline"} className="gap-1">
              {online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
              {online ? "Agent online" : "Agent offline"}
            </Badge>
            {health?.mockMode && <Badge variant="secondary">Mock mode</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            {error}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Agent</p>
            <p className="font-medium">{health ? `v${health.agentVersion}` : "—"}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Beautora bridge</p>
            <p className="font-medium">
              {bridge?.configured
                ? bridge.syncEnabled
                  ? "Auto-sync on"
                  : "Configured"
                : "Optional (web punch works)"}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Last sync</p>
            <p className="font-medium text-sm">
              {bridge?.lastResult ?? bridge?.lastError ?? "—"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={() => void refresh()}>
            {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
            Refresh status
          </Button>
          <Button type="button" variant="outline" disabled={pending || !online} onClick={runDiscover}>
            <PlugZap className="mr-2 size-4" />
            Discover terminal
          </Button>
          <Button type="button" disabled={pending || !online} onClick={runSync}>
            <Fingerprint className="mr-2 size-4" />
            Sync punches to web
          </Button>
        </div>

        {devices.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="terminal">Attendance terminal</Label>
            <select
              id="terminal"
              className="flex h-9 w-full max-w-md rounded-lg border border-input bg-background px-2.5 text-sm"
              value={selectedDeviceId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedDeviceId(id);
                startTransition(async () => {
                  try {
                    await connectDevice(id);
                    setUsers(await getDeviceUsers(id));
                  } catch (err) {
                    notify.error(err instanceof Error ? err.message : "Connect failed");
                  }
                });
              }}
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.id})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <div>
            <p className="text-sm font-medium">Thumb punch (real SDK path)</p>
            <p className="text-xs text-muted-foreground">
              Enroll scanner user IDs under Thumb enrollment (mock ZK users are usually{" "}
              <code>1</code> and <code>2</code>). Punch sends through the agent into Beautora so the
              log shows as Thumb.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[160px] flex-1 space-y-1.5">
              <Label htmlFor="thumb-punch">Thumb / user ID</Label>
              <Input
                id="thumb-punch"
                value={thumbId}
                onChange={(e) => setThumbId(e.target.value)}
                placeholder="e.g. 1"
                list="enrolled-thumbs"
              />
              <datalist id="enrolled-thumbs">
                {enrolledWithThumb.map((s) => (
                  <option key={s.id} value={s.thumb_id ?? ""}>
                    {s.full_name}
                  </option>
                ))}
                {users.map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.name ?? u.userId}
                  </option>
                ))}
              </datalist>
            </div>
            <Button
              type="button"
              disabled={pending || !online}
              onClick={() => runThumbPunch(thumbId)}
            >
              {pending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Fingerprint className="mr-2 size-4" />
              )}
              Punch thumb
            </Button>
          </div>

          {(enrolledWithThumb.length > 0 || users.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {enrolledWithThumb.map((s) => (
                <Button
                  key={s.id}
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending || !online}
                  className={cn("h-8")}
                  onClick={() => {
                    setThumbId(s.thumb_id ?? "");
                    runThumbPunch(s.thumb_id ?? "");
                  }}
                >
                  {s.full_name}
                  <span className="ml-1 text-muted-foreground">({s.thumb_id})</span>
                </Button>
              ))}
              {users
                .filter((u) => !enrolledWithThumb.some((s) => s.thumb_id === u.userId))
                .map((u) => (
                  <Button
                    key={u.userId}
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending || !online}
                    className="h-8"
                    onClick={() => {
                      setThumbId(u.userId);
                      runThumbPunch(u.userId);
                    }}
                  >
                    Device {u.name ?? u.userId}
                  </Button>
                ))}
            </div>
          )}

          {lastMessage && (
            <p className="text-xs text-muted-foreground">Last result: {lastMessage}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
