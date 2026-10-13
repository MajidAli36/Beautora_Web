"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  connectDevice,
  disconnectDevice,
  discoverDevices,
  getAgentDeviceStatus,
  getAgentHealth,
  getSyncOpsAgentConfig,
  type SyncOpsAgentHealth,
  type SyncOpsDeviceInfo,
} from "@/lib/devices/syncops-agent";
import { filterRelevantSalonSdkDevices } from "@/lib/devices/relevant-sdk-devices";
import {
  formatSyncOpsConnectionState,
  formatSyncOpsDeviceType,
  isSdkDeviceLinked,
  syncOpsDeviceEndpoint,
} from "@/lib/devices/syncops-labels";
import { notify } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Fingerprint,
  Loader2,
  Plug,
  PlugZap,
  Printer,
  RefreshCw,
  Unplug,
  Wallet,
  Wifi,
  WifiOff,
} from "lucide-react";

type SdkDevicesPanelProps = {
  canManage?: boolean;
};

type ConnectionState = ReturnType<typeof formatSyncOpsConnectionState>;

function TypeIcon({ type }: { type: string | number | undefined }) {
  const label = formatSyncOpsDeviceType(type).toLowerCase();
  if (label.includes("fingerprint") || label.includes("attendance")) {
    return <Fingerprint className="size-4 shrink-0 text-teal-600" />;
  }
  if (label.includes("drawer")) {
    return <Wallet className="size-4 shrink-0 text-amber-600" />;
  }
  return <Printer className="size-4 shrink-0 text-muted-foreground" />;
}

function ConnectionBadge({ state }: { state: ConnectionState }) {
  if (state === "connected") {
    return (
      <Badge className="border-transparent bg-teal-600 text-white hover:bg-teal-600 hover:text-white">
        Connected
      </Badge>
    );
  }
  if (state === "mock") {
    return <Badge variant="secondary">Connected (mock)</Badge>;
  }
  if (state === "disconnected") {
    return <Badge variant="outline">Disconnected</Badge>;
  }
  return <Badge variant="outline">Unknown</Badge>;
}

export function SdkDevicesPanel({ canManage = false }: SdkDevicesPanelProps) {
  const [pending, startTransition] = useTransition();
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [health, setHealth] = useState<SyncOpsAgentHealth | null>(null);
  const [devices, setDevices] = useState<SyncOpsDeviceInfo[]>([]);
  const [connectionById, setConnectionById] = useState<Record<string, ConnectionState>>({});
  const [error, setError] = useState<string | null>(null);
  const devicesRef = useRef(devices);
  devicesRef.current = devices;

  const online = Boolean(health);

  const linkedCount = useMemo(
    () => Object.values(connectionById).filter(isSdkDeviceLinked).length,
    [connectionById]
  );

  const refreshStatuses = useCallback(async (list: SyncOpsDeviceInfo[]) => {
    const next: Record<string, ConnectionState> = {};
    await Promise.all(
      list.map(async (d) => {
        try {
          const st = await getAgentDeviceStatus(d.id);
          next[d.id] = formatSyncOpsConnectionState(st.connectionState ?? st.state);
        } catch {
          next[d.id] = formatSyncOpsConnectionState(d.connectionState ?? d.status);
        }
      })
    );
    setConnectionById(next);
  }, []);

  const loadHardware = useCallback(async () => {
    const result = await discoverDevices(true);
    const relevant = filterRelevantSalonSdkDevices(result.devices ?? []);
    setDevices(relevant);
    await refreshStatuses(relevant);
    return relevant;
  }, [refreshStatuses]);

  const refresh = useCallback(
    async (discover = false) => {
      setError(null);
      let healthOk = false;
      try {
        setHealth(await getAgentHealth());
        healthOk = true;
      } catch (e) {
        setHealth(null);
        setError(
          e instanceof Error
            ? e.message
            : "SyncOps Device Agent is offline. Run: cd device_agent/src/Beautora.DeviceAgent && dotnet run"
        );
        return;
      }

      try {
        if (discover) {
          await loadHardware();
        } else if (devicesRef.current.length > 0) {
          await refreshStatuses(devicesRef.current);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not talk to the SDK";
        setError(
          healthOk && /api key|401|unauthorized|invalid or missing/i.test(msg)
            ? "Agent rejected the request. Restart the Device Agent (dotnet run) so it loads the shared SyncOps key."
            : msg
        );
      }
    },
    [loadHardware, refreshStatuses]
  );

  useEffect(() => {
    // Clears any old wrong key from localStorage and uses the shared SyncOps key.
    getSyncOpsAgentConfig();
    void refresh(true);
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refresh(false);
    }, 20000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh(false);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  function runDiscover() {
    startTransition(async () => {
      try {
        const list = await loadHardware();
        notify.success("Devices discovered", { description: `${list.length} salon device(s)` });
      } catch (e) {
        notify.error(e instanceof Error ? e.message : "Discover failed");
      }
    });
  }

  function runConnect(deviceId: string, name: string) {
    if (!canManage) return;
    setRowBusy(deviceId);
    startTransition(async () => {
      try {
        await connectDevice(deviceId);
        await refreshStatuses(devicesRef.current);
        notify.success("Device connected", { description: name });
      } catch (e) {
        notify.error(e instanceof Error ? e.message : "Connect failed");
      } finally {
        setRowBusy(null);
      }
    });
  }

  function runDisconnect(deviceId: string, name: string) {
    if (!canManage) return;
    setRowBusy(deviceId);
    startTransition(async () => {
      try {
        await disconnectDevice(deviceId);
        await refreshStatuses(devicesRef.current);
        notify.success("Device disconnected", { description: name });
      } catch (e) {
        notify.error(e instanceof Error ? e.message : "Disconnect failed");
      } finally {
        setRowBusy(null);
      }
    });
  }

  return (
    <Card className="border-primary/25 shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Salon hardware (SyncOps SDK)</CardTitle>
            <CardDescription>
              Printers, cash drawers, fingerprint readers, and attendance terminals on{" "}
              <strong>this computer</strong>. Connect only what you use at this POS. Requires the
              local Device Agent (
              <code className="text-xs">device_agent</code>) on{" "}
              <code className="text-xs">127.0.0.1:17890</code>.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={online ? "default" : "outline"} className="gap-1">
              {online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
              {online ? "Agent online" : "Agent offline"}
            </Badge>
            {health?.mockMode && <Badge variant="secondary">Mock mode</Badge>}
            <Badge variant="outline">{linkedCount} connected</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={() => void refresh(true)}>
            {pending && !rowBusy ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-4" />
            )}
            Refresh
          </Button>
          <Button type="button" disabled={pending || !online || !canManage} onClick={runDiscover}>
            <PlugZap className="mr-2 size-4" />
            Discover devices
          </Button>
          <Button type="button" variant="ghost" render={<Link href="/attendance" />}>
            Attendance setup →
          </Button>
        </div>

        {error && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            {error}
          </p>
        )}

        {!canManage && (
          <p className="text-xs text-muted-foreground">
            You can view devices; managers can connect or disconnect hardware.
          </p>
        )}

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canManage ? 5 : 4}
                    className="text-sm text-muted-foreground"
                  >
                    {online
                      ? "No salon devices found — click Discover devices (enable MockMode for test hardware)."
                      : "Start the Device Agent on this PC, then discover printers, drawers, fingerprint, and attendance terminals."}
                  </TableCell>
                </TableRow>
              ) : (
                devices.map((d) => {
                  const conn = connectionById[d.id] ?? formatSyncOpsConnectionState(d.connectionState);
                  const linked = isSdkDeviceLinked(conn);
                  const busy = rowBusy === d.id;
                  return (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <TypeIcon type={d.type} />
                          <div>
                            <p className="font-medium">{d.name}</p>
                            <p className="text-xs text-muted-foreground">{d.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{formatSyncOpsDeviceType(d.type)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{syncOpsDeviceEndpoint(d)}</TableCell>
                      <TableCell>
                        <ConnectionBadge state={conn} />
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          {linked ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={pending || busy || !online}
                              onClick={() => runDisconnect(d.id, d.name)}
                            >
                              {busy ? (
                                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                              ) : (
                                <Unplug className="mr-1.5 size-3.5" />
                              )}
                              Disconnect
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              disabled={pending || busy || !online}
                              onClick={() => runConnect(d.id, d.name)}
                            >
                              {busy ? (
                                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                              ) : (
                                <Plug className="mr-1.5 size-3.5" />
                              )}
                              Connect
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {health && (
          <p className="text-xs text-muted-foreground">
            Agent v{health.agentVersion}
            {health.mockMode ? " · mock hardware enabled for development" : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
