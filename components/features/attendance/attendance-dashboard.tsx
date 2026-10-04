"use client";

import { useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AttendanceButtons } from "@/components/features/staff/staff-forms";
import { AttendanceDesk } from "@/components/features/attendance/attendance-desk";
import { ThumbAttendanceLiveSync } from "@/components/features/attendance/thumb-attendance-live-sync";
import type { AttendanceOverview, AttendanceReport } from "@/lib/actions/attendance";
import { attendanceMethodLabel } from "@/lib/attendance/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginatedList } from "@/components/ui/table-pagination";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { formatAttendanceMinutes } from "@/lib/attendance/duration";
import { addLocalDays, getLocalDateString, startOfLocalMonth } from "@/lib/dates/local";
import { Fingerprint } from "lucide-react";

type StaffMember = {
  id: string;
  full_name: string;
  thumb_id: string | null;
  thumb_enrolled_at: string | null;
};

type AttendanceDashboardProps = {
  report: AttendanceReport;
  overview: AttendanceOverview;
  staffList: StaffMember[];
  canManage: boolean;
  from: string;
  to: string;
  view: string;
};

function MethodBadge({ method }: { method: string }) {
  const isThumb = method === "BIOMETRIC";
  return (
    <Badge variant={isThumb ? "default" : "outline"} className={cn(isThumb && "gap-1")}>
      {isThumb && <Fingerprint className="size-3" />}
      {attendanceMethodLabel(method)}
    </Badge>
  );
}

export function AttendanceDashboard({
  report,
  overview,
  staffList,
  canManage,
  from,
  to,
  view,
}: AttendanceDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function setParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    startTransition(() => {
      router.push(`/attendance?${params.toString()}`);
    });
  }

  function setPreset(preset: "today" | "week" | "month") {
    const toStr = getLocalDateString();
    let fromStr = toStr;
    if (preset === "week") fromStr = addLocalDays(toStr, -6);
    else if (preset === "month") fromStr = startOfLocalMonth(toStr);
    setParams({ from: fromStr, to: toStr, view: preset === "today" ? "daily" : "range" });
  }

  const thumbScans = report.records.filter((r) => r.method === "BIOMETRIC").length;
  const onDutyIds = useMemo(
    () => new Set(overview.onDuty.map((s) => s.staffId)),
    [overview.onDuty]
  );

  return (
    <div className="space-y-6">
      {/* Only probe local Device Agent on Attendance — not during onboarding/dashboard. */}
      <ThumbAttendanceLiveSync />
      {canManage && (
        <AttendanceDesk
          staff={staffList}
          onDuty={overview.onDuty}
          enrolledCount={overview.enrolledCount}
        />
      )}

      {!canManage && (
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>On duty now</CardDescription>
            <CardTitle className="text-2xl">{overview.onDuty.length}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overview.onDuty.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nobody checked in yet.</p>
            ) : (
              overview.onDuty.map((s) => (
                <div key={s.staffId} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{s.staffName}</span>
                  <MethodBadge method={s.method} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["today", "week", "month"] as const).map((p) => (
            <Button
              key={p}
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              className={cn(
                p === "today" && from === to && "border-primary bg-accent text-accent-foreground"
              )}
              onClick={() => setPreset(p)}
            >
              {p === "today" ? "Today" : p === "week" ? "This week" : "This month"}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="from" className="text-xs">
              From
            </Label>
            <Input
              id="from"
              type="date"
              value={from}
              className="h-8 w-36"
              onChange={(e) => setParams({ from: e.target.value, view: "range" })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to" className="text-xs">
              To
            </Label>
            <Input
              id="to"
              type="date"
              value={to}
              className="h-8 w-36"
              onChange={(e) => setParams({ to: e.target.value, view: "range" })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="staff" className="text-xs">
              Staff
            </Label>
            <select
              id="staff"
              className="flex h-8 rounded-lg border border-input bg-background px-2 text-sm"
              value={searchParams.get("staff") ?? ""}
              onChange={(e) => setParams({ staff: e.target.value })}
            >
              <option value="">All staff</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: "Sessions", value: report.stats.totalSessions },
          { label: "Thumb", value: thumbScans },
          { label: "On duty", value: report.stats.openSessions },
          { label: "Staff-days", value: report.stats.uniqueStaffDays },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="py-3 pb-2">
              <CardDescription>{s.label}</CardDescription>
              <CardTitle className="text-xl">{s.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {view !== "daily" && report.summaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Staff summary</CardTitle>
            <CardDescription>Hours for selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <PaginatedList
              items={report.summaries}
              search={{
                placeholder: "Search staff…",
                getText: (s) => s.staffName,
                emptyFiltered: (
                  <p className="text-sm text-muted-foreground">No staff match your search.</p>
                ),
              }}
            >
              {(slice) => (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Sessions</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Avg / day</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slice.map((s) => (
                      <TableRow key={s.staffId}>
                        <TableCell className="font-medium">{s.staffName}</TableCell>
                        <TableCell>{s.sessions}</TableCell>
                        <TableCell>{s.workingDays}</TableCell>
                        <TableCell>{s.totalHours}h</TableCell>
                        <TableCell>{s.avgHoursPerDay}h</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </PaginatedList>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Log</CardTitle>
          <CardDescription>{from === to ? from : `${from} → ${to}`}</CardDescription>
        </CardHeader>
        <CardContent>
          <PaginatedList
            items={report.records}
            empty={
              <p className="text-sm text-muted-foreground">No attendance records for this period.</p>
            }
            search={{
              placeholder: "Search staff, method…",
              getText: (a) =>
                [
                  a.staff?.full_name ?? "",
                  a.method,
                  attendanceMethodLabel(a.method),
                  a.check_out_at ? "checked out" : "on duty",
                ].join(" "),
              emptyFiltered: (
                <p className="text-sm text-muted-foreground">No records match your search.</p>
              ),
            }}
          >
            {(slice) => (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>In</TableHead>
                    <TableHead>Out</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Method</TableHead>
                    {canManage && <TableHead></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slice.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.staff?.full_name ?? "—"}</TableCell>
                      <TableCell>{formatDateTime(a.check_in_at)}</TableCell>
                      <TableCell>
                        {a.check_out_at ? (
                          formatDateTime(a.check_out_at)
                        ) : (
                          <Badge variant="secondary">On duty</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatAttendanceMinutes(a.durationMinutes)}</TableCell>
                      <TableCell>
                        <MethodBadge method={a.method} />
                      </TableCell>
                      {canManage && a.staff && (
                        <TableCell>
                          <AttendanceButtons
                            staffId={a.staff.id}
                            onDuty={!a.check_out_at || onDutyIds.has(a.staff.id)}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </PaginatedList>
        </CardContent>
      </Card>
    </div>
  );
}
