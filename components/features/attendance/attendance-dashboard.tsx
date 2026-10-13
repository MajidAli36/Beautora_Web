"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { usePageVisible } from "@/hooks/use-page-visible";
import { AttendanceButtons } from "@/components/features/staff/staff-forms";
import { AttendanceDesk } from "@/components/features/attendance/attendance-desk";
import {
  AttendanceCheatsheetButton,
  AttendanceGuideButton,
} from "@/components/features/attendance/attendance-help";
import {
  THUMB_ATTENDANCE_EVENT,
  ThumbAttendanceLiveSync,
} from "@/components/features/attendance/thumb-attendance-live-sync";
import type { AttendanceOverview, AttendanceReport } from "@/lib/actions/attendance";
import { attendanceMethodLabel } from "@/lib/attendance/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginatedList } from "@/components/ui/table-pagination";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { formatAttendanceMinutes } from "@/lib/attendance/duration";
import {
  downloadExportDocument,
  type ExportDocument,
} from "@/lib/reports/export-formats";
import {
  addLocalDays,
  getLocalDateString,
  isoToLocalDateString,
  startOfLocalMonth,
} from "@/lib/dates/local";
import {
  CalendarDays,
  Clock3,
  Download,
  Fingerprint,
  Timer,
  UserCheck,
} from "lucide-react";

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

type PeriodPreset = "today" | "daily" | "week" | "month" | "year" | "custom";

const PERIODS: { id: PeriodPreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "daily", label: "Daily" },
  { id: "week", label: "Weekly" },
  { id: "month", label: "Monthly" },
  { id: "year", label: "Yearly" },
  { id: "custom", label: "Custom" },
];

function MethodBadge({ method }: { method: string }) {
  const isThumb = method === "BIOMETRIC";
  return (
    <Badge
      variant={isThumb ? "default" : "outline"}
      className={cn(
        "gap-1 font-normal",
        isThumb && "border-transparent bg-[#0FA99A] text-white [&_svg]:text-white"
      )}
    >
      {isThumb ? <Fingerprint className="size-3" /> : null}
      {attendanceMethodLabel(method)}
    </Badge>
  );
}

function StatusBadge({ open }: { open: boolean }) {
  return open ? (
    <Badge className="border-transparent bg-teal-600 text-white font-normal">
      Checked in
    </Badge>
  ) : (
    <Badge variant="secondary" className="font-normal">
      Checked out
    </Badge>
  );
}

function resolveActivePreset(from: string, to: string, view: string): PeriodPreset {
  if (view === "today" || view === "daily" || view === "week" || view === "month" || view === "year" || view === "custom") {
    return view;
  }
  if (from === to) return "daily";
  return "custom";
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
  const pageVisible = usePageVisible();
  const [pending, startTransition] = useTransition();
  const [methodFilter, setMethodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const onPunch = () => {
      if (document.visibilityState !== "visible") return;
      // Coalesce rapid punches into one refresh.
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 80);
    };
    window.addEventListener(THUMB_ATTENDANCE_EVENT, onPunch);
    return () => {
      window.removeEventListener(THUMB_ATTENDANCE_EVENT, onPunch);
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [router]);

  // Backup refresh only while tab is visible (primary path is agent long-poll).
  useEffect(() => {
    if (!pageVisible) return;
    const timer = setInterval(() => router.refresh(), 30000);
    return () => clearInterval(timer);
  }, [router, pageVisible]);

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

  function setPreset(preset: PeriodPreset) {
    const today = getLocalDateString();
    if (preset === "today") {
      setParams({ from: today, to: today, view: "today" });
      return;
    }
    if (preset === "daily") {
      const day = from === to ? from : today;
      setParams({ from: day, to: day, view: "daily" });
      return;
    }
    if (preset === "week") {
      setParams({ from: addLocalDays(today, -6), to: today, view: "week" });
      return;
    }
    if (preset === "month") {
      setParams({ from: startOfLocalMonth(today), to: today, view: "month" });
      return;
    }
    if (preset === "year") {
      setParams({ from: `${today.slice(0, 4)}-01-01`, to: today, view: "year" });
      return;
    }
    setParams({ view: "custom" });
  }

  const activePreset = resolveActivePreset(from, to, view);

  const filteredRecords = useMemo(() => {
    return report.records.filter((r) => {
      if (methodFilter && r.method !== methodFilter) return false;
      if (statusFilter === "open" && r.check_out_at) return false;
      if (statusFilter === "closed" && !r.check_out_at) return false;
      return true;
    });
  }, [report.records, methodFilter, statusFilter]);

  const selectedStaffId = searchParams.get("staff") ?? "";
  const selectedStaffName = useMemo(() => {
    if (!selectedStaffId) return null;
    return staffList.find((s) => s.id === selectedStaffId)?.full_name ?? null;
  }, [selectedStaffId, staffList]);

  const kpi = useMemo(() => {
    const thumbScans = filteredRecords.filter((r) => r.method === "BIOMETRIC").length;
    const openInPeriod = filteredRecords.filter((r) => !r.check_out_at).length;
    const staffDays = new Set(
      filteredRecords.map(
        (r) => `${r.staff?.id ?? "?"}:${isoToLocalDateString(r.check_in_at)}`
      )
    ).size;
    const totalMinutes = filteredRecords.reduce(
      (sum, r) => sum + (r.durationMinutes ?? 0),
      0
    );
    return {
      sessions: filteredRecords.length,
      thumbScans,
      onDuty: overview.onDuty.length,
      openInPeriod,
      staffDays,
      totalMinutes,
      totalHoursLabel: formatAttendanceMinutes(totalMinutes),
      totalHoursDecimal: Math.round((totalMinutes / 60) * 10) / 10,
    };
  }, [filteredRecords, overview.onDuty.length]);

  const onDutyIds = useMemo(
    () => new Set(overview.onDuty.map((s) => s.staffId)),
    [overview.onDuty]
  );

  const showSummary =
    (!selectedStaffId && activePreset !== "today" && activePreset !== "daily") ||
    (Boolean(selectedStaffId) && report.summaries.length > 0);

  const rangeLabel = from === to ? from : `${from} → ${to}`;

  async function downloadExcel() {
    if (filteredRecords.length === 0) {
      toast.error("No attendance rows to export for this filter");
      return;
    }
    const staffLabel = selectedStaffName ?? "All staff";
    const doc: ExportDocument = {
      filenameBase: `attendance-${from}_to_${to}${selectedStaffId ? `-${staffLabel.replace(/\s+/g, "_")}` : ""}`,
      title: "Attendance report",
      subtitle: `${staffLabel} · ${rangeLabel} · Total ${kpi.totalHoursLabel}`,
      sheets: [
        {
          name: "Summary",
          headers: ["Staff", "Date range", "Sessions", "Thumb scans", "Total hours", "Total minutes", "Staff-days"],
          rows: [
            [
              staffLabel,
              rangeLabel,
              kpi.sessions,
              kpi.thumbScans,
              kpi.totalHoursDecimal,
              kpi.totalMinutes,
              kpi.staffDays,
            ],
          ],
        },
        {
          name: "Sessions",
          headers: [
            "Staff",
            "Check-in",
            "Check-out",
            "Duration",
            "Duration (minutes)",
            "Method",
            "Status",
          ],
          rows: filteredRecords.map((r) => [
            r.staff?.full_name ?? "",
            formatDateTime(r.check_in_at),
            r.check_out_at ? formatDateTime(r.check_out_at) : "",
            formatAttendanceMinutes(r.durationMinutes),
            r.durationMinutes ?? "",
            attendanceMethodLabel(r.method),
            r.check_out_at ? "Checked out" : "Checked in",
          ]),
        },
        ...(report.summaries.length > 0
          ? [
              {
                name: "Staff hours",
                headers: ["Staff", "Sessions", "Days", "Hours", "Avg hours / day"],
                rows: report.summaries.map((s) => [
                  s.staffName,
                  s.sessions,
                  s.workingDays,
                  s.totalHours,
                  s.avgHoursPerDay,
                ]),
              },
            ]
          : []),
      ],
    };
    try {
      await downloadExportDocument(doc, "xlsx");
      toast.success("Excel downloaded", {
        description: `${staffLabel} · ${kpi.totalHoursLabel}`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create Excel file");
    }
  }

  return (
    <div className="space-y-5">
      <ThumbAttendanceLiveSync />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-lg font-bold tracking-tight text-[#172033] sm:text-2xl">
            Attendance
          </h1>
          <p className="text-sm text-muted-foreground text-pretty">
            Track staff attendance, working hours, and daily sessions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AttendanceGuideButton />
          <AttendanceCheatsheetButton />
        </div>
      </div>

      {canManage && (
        <AttendanceDesk
          staff={staffList}
          onDuty={overview.onDuty}
          enrolledCount={overview.enrolledCount}
        />
      )}

      {!canManage && (
        <Card className="rounded-2xl border-[#E5E7EB] shadow-none">
          <CardHeader className="pb-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              On duty now
            </p>
            <CardTitle className="text-2xl tabular-nums text-[#172033]">
              {overview.onDuty.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overview.onDuty.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nobody checked in yet.</p>
            ) : (
              overview.onDuty.map((s) => (
                <div key={s.staffId} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-[#172033]">{s.staffName}</span>
                  <MethodBadge method={s.method} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="rounded-2xl border-[#E5E7EB] shadow-none">
        <CardContent className="flex flex-col gap-4 p-3 sm:p-4">
          <div className="-mx-1 flex gap-1.5 overflow-x-auto overscroll-x-contain px-1 pb-0.5 [-webkit-overflow-scrolling:touch]">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={pending}
                onClick={() => setPreset(p.id)}
                className={cn(
                  "h-8 shrink-0 rounded-lg px-3 text-sm font-medium transition-colors",
                  activePreset === p.id
                    ? "bg-[#0FA99A] text-white shadow-sm"
                    : "bg-[#F8FAFC] text-[#172033] hover:bg-teal-50 border border-[#E5E7EB]"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
            <div className="min-w-0 space-y-1">
              <Label htmlFor="att-from" className="text-xs text-muted-foreground">
                From
              </Label>
              <Input
                id="att-from"
                type="date"
                value={from}
                className="h-9 w-full rounded-xl border-[#E5E7EB] sm:h-8 sm:w-[9.5rem]"
                onChange={(e) => {
                  const next = e.target.value;
                  const nextTo = next > to ? next : to;
                  setParams({
                    from: next,
                    to: nextTo,
                    view: next === nextTo ? "daily" : "custom",
                  });
                }}
              />
            </div>
            <div className="min-w-0 space-y-1">
              <Label htmlFor="att-to" className="text-xs text-muted-foreground">
                To
              </Label>
              <Input
                id="att-to"
                type="date"
                value={to}
                className="h-9 w-full rounded-xl border-[#E5E7EB] sm:h-8 sm:w-[9.5rem]"
                onChange={(e) => {
                  const next = e.target.value;
                  const nextFrom = next < from ? next : from;
                  setParams({
                    from: nextFrom,
                    to: next,
                    view: nextFrom === next ? "daily" : "custom",
                  });
                }}
              />
            </div>
            <div className="min-w-0 space-y-1 col-span-2 sm:col-span-1">
              <Label htmlFor="att-staff" className="text-xs text-muted-foreground">
                Staff
              </Label>
              <select
                id="att-staff"
                className="flex h-9 w-full min-w-0 rounded-xl border border-[#E5E7EB] bg-white px-2 text-sm sm:h-8 sm:min-w-[10rem] sm:w-auto"
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
            <div className="min-w-0 space-y-1">
              <Label htmlFor="att-method" className="text-xs text-muted-foreground">
                Method
              </Label>
              <select
                id="att-method"
                className="flex h-9 w-full rounded-xl border border-[#E5E7EB] bg-white px-2 text-sm sm:h-8 sm:min-w-[9rem] sm:w-auto"
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
              >
                <option value="">All methods</option>
                <option value="BIOMETRIC">Thumb scan</option>
                <option value="MANUAL">Manual</option>
                <option value="DEVICE">Device PIN</option>
                <option value="APP">App</option>
              </select>
            </div>
            <div className="min-w-0 space-y-1">
              <Label htmlFor="att-status" className="text-xs text-muted-foreground">
                Status
              </Label>
              <select
                id="att-status"
                className="flex h-9 w-full rounded-xl border border-[#E5E7EB] bg-white px-2 text-sm sm:h-8 sm:min-w-[9rem] sm:w-auto"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="open">Checked in</option>
                <option value="closed">Checked out</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Sessions",
            value: String(kpi.sessions),
            hint: rangeLabel,
            icon: CalendarDays,
          },
          {
            label: "Thumb Scans",
            value: String(kpi.thumbScans),
            hint: "Biometric sessions",
            icon: Fingerprint,
          },
          {
            label: "Total Hours",
            value: kpi.totalHoursLabel === "—" ? "0m" : kpi.totalHoursLabel,
            hint: selectedStaffName
              ? `${selectedStaffName} · closed sessions`
              : "Sum of closed sessions",
            icon: Timer,
            emphasize: true,
          },
          {
            label: "On Duty",
            value: String(kpi.onDuty),
            hint: "Currently checked in",
            icon: UserCheck,
          },
        ].map((s) => (
          <Card
            key={s.label}
            className={cn(
              "rounded-2xl border-[#E5E7EB] bg-white shadow-none transition-colors hover:border-teal-200",
              s.emphasize && "border-teal-200 bg-teal-50/40"
            )}
          >
            <CardContent className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-semibold tabular-nums tracking-tight text-[#172033]">
                  {s.value}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">{s.hint}</p>
              </div>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-[#0FA99A]">
                <s.icon className="size-4" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedStaffName ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-teal-200 bg-teal-50/50 px-4 py-3">
          <p className="text-sm text-[#172033]">
            <span className="font-semibold">{selectedStaffName}</span>
            <span className="text-muted-foreground"> · {rangeLabel}</span>
          </p>
          <p className="text-sm font-semibold tabular-nums text-[#0FA99A]">
            Total hours: {kpi.totalHoursLabel === "—" ? "0m" : kpi.totalHoursLabel}
            <span className="ml-2 font-normal text-muted-foreground">
              ({kpi.totalHoursDecimal}h)
            </span>
          </p>
        </div>
      ) : null}

      {showSummary && (
        <Card className="rounded-2xl border-[#E5E7EB] shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[#172033]">Staff summary</CardTitle>
            <p className="text-sm text-muted-foreground">Hours for {rangeLabel}</p>
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
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
                          <TableCell className="font-medium text-[#172033]">
                            {s.staffName}
                          </TableCell>
                          <TableCell className="tabular-nums">{s.sessions}</TableCell>
                          <TableCell className="tabular-nums">{s.workingDays}</TableCell>
                          <TableCell className="tabular-nums">{s.totalHours}h</TableCell>
                          <TableCell className="tabular-nums">{s.avgHoursPerDay}h</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </PaginatedList>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl border-[#E5E7EB] shadow-none">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
          <div>
            <CardTitle className="text-base text-[#172033]">Attendance log</CardTitle>
            <p className="text-sm text-muted-foreground">
              {selectedStaffName ? `${selectedStaffName} · ` : null}
              {rangeLabel}
              {kpi.sessions > 0
                ? ` · ${kpi.totalHoursLabel === "—" ? "0m" : kpi.totalHoursLabel} total`
                : null}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pending ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock3 className="size-3.5 animate-pulse" />
                Updating…
              </span>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-xl"
              disabled={filteredRecords.length === 0}
              onClick={() => void downloadExcel()}
            >
              <Download className="size-3.5" />
              Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <PaginatedList
            items={filteredRecords}
            empty={
              <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#F8FAFC] px-4 py-10 text-center">
                <p className="text-sm font-medium text-[#172033]">No attendance records</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try another date range, staff filter, or sync the scanner.
                </p>
              </div>
            }
            search={{
              placeholder: "Search by staff name…",
              getText: (a) =>
                [
                  a.staff?.full_name ?? "",
                  a.method,
                  attendanceMethodLabel(a.method),
                  a.check_out_at ? "checked out" : "checked in",
                ].join(" "),
              emptyFiltered: (
                <p className="text-sm text-muted-foreground">No records match your search.</p>
              ),
            }}
          >
            {(slice) => (
              <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#F8FAFC] hover:bg-[#F8FAFC]">
                      <TableHead>Staff</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead>Check-out</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      {canManage && <TableHead className="w-[1%]">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slice.map((a) => {
                      const open = !a.check_out_at;
                      return (
                        <TableRow key={a.id} className="h-12">
                          <TableCell className="font-medium text-[#172033]">
                            {a.staff?.full_name ?? "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {formatDateTime(a.check_in_at)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {a.check_out_at ? formatDateTime(a.check_out_at) : "—"}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {formatAttendanceMinutes(a.durationMinutes)}
                          </TableCell>
                          <TableCell>
                            <MethodBadge method={a.method} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge open={open} />
                          </TableCell>
                          {canManage && (
                            <TableCell>
                              {a.staff ? (
                                <AttendanceButtons
                                  staffId={a.staff.id}
                                  onDuty={open || onDutyIds.has(a.staff.id)}
                                />
                              ) : null}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </PaginatedList>
        </CardContent>
      </Card>
    </div>
  );
}
