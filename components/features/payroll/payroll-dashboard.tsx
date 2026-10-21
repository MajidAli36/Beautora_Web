"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  CalendarX2,
  CheckCircle2,
  Clock3,
  Scale,
  Users,
} from "lucide-react";
import {
  generatePayrollRun,
  setPayrollRunStatus,
  type PayrollDashboardData,
} from "@/lib/actions/payroll-runs";
import { waiveStaffFine } from "@/lib/actions/staff-fines";
import { formatCurrency } from "@/lib/format";
import { notify } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PayrollRunStatus } from "@/lib/payroll/types";
import { cn } from "@/lib/utils";

type ViewFilter =
  | "all"
  | "fines"
  | "pending"
  | "paid"
  | "absent"
  | "warnings";

function statusVariant(status: PayrollRunStatus) {
  switch (status) {
    case "PAID":
      return "default" as const;
    case "APPROVED":
      return "secondary" as const;
    case "REVIEWED":
      return "outline" as const;
    default:
      return "outline" as const;
  }
}

function toCsv(data: PayrollDashboardData): string {
  const header = [
    "Employee ID",
    "Employee Name",
    "Payment Type",
    "Base Salary/Hourly Rate",
    "Days Present",
    "Regular Hours",
    "Overtime Hours",
    "Gross Earnings",
    "Deductions",
    "Net Pay",
    "Payment Status",
  ];
  const rows = data.lines.map((l) => [
    l.employee_code ?? l.staff_id.slice(0, 8),
    l.staff_name,
    l.pay_type,
    String(l.base_rate),
    String(l.days_present),
    String(l.regular_hours),
    String(l.overtime_hours),
    String(l.gross_earnings),
    String(l.total_deductions),
    String(l.net_pay),
    l.payment_id ? "PAID" : data.run?.status ?? "DRAFT",
  ]);
  return [header, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function pushRange(
  router: ReturnType<typeof useRouter>,
  month: string,
  from: string,
  to: string,
  view: ViewFilter
) {
  const params = new URLSearchParams();
  params.set("month", month);
  params.set("from", from);
  params.set("to", to);
  if (view !== "all") params.set("view", view);
  router.push(`/payroll?${params.toString()}`);
}

export function PayrollDashboard({
  data,
  canManage,
  initialView = "all",
}: {
  data: PayrollDashboardData;
  canManage: boolean;
  initialView?: ViewFilter;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [month, setMonth] = useState(data.month);
  const [from, setFrom] = useState(data.from);
  const [to, setTo] = useState(data.to);
  const [view, setView] = useState<ViewFilter>(initialView);
  const [q, setQ] = useState("");
  const [payFilter, setPayFilter] = useState<"ALL" | "MONTHLY" | "HOURLY">("ALL");

  const filteredLines = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return data.lines.filter((l) => {
      if (view === "pending" && (l.payment_id || l.net_pay <= 0)) return false;
      if (view === "paid" && !l.payment_id) return false;
      if (payFilter !== "ALL" && l.pay_type !== payFilter) return false;
      if (!qq) return true;
      return (
        l.staff_name.toLowerCase().includes(qq) ||
        (l.employee_code ?? "").toLowerCase().includes(qq) ||
        (l.department ?? "").toLowerCase().includes(qq)
      );
    });
  }, [data.lines, q, payFilter, view]);

  const openFines = useMemo(
    () => data.fines.filter((f) => f.status === "OPEN"),
    [data.fines]
  );
  const shownFines = view === "fines" ? openFines : data.fines.slice(0, 12);
  const shownPayments =
    view === "paid"
      ? data.payments.filter((p) => p.payment_type === "SALARY")
      : data.payments.slice(0, 12);
  const shownAbsences = view === "absent" ? data.absences : data.absences.slice(0, 12);

  function applyRange() {
    pushRange(router, month, from, to, view);
  }

  function changeMonth(next: string) {
    setMonth(next);
    const [y, m] = next.split("-").map(Number);
    const last = new Date(y, m, 0).getDate();
    const nextFrom = `${next}-01`;
    const nextTo = `${next}-${String(last).padStart(2, "0")}`;
    setFrom(nextFrom);
    setTo(nextTo);
    pushRange(router, next, nextFrom, nextTo, view);
  }

  function selectView(next: ViewFilter) {
    setView(next);
    pushRange(router, month, from, to, next);
  }

  function generate(force = false) {
    const [y, m] = month.split("-").map(Number);
    startTransition(async () => {
      const res = await generatePayrollRun({ year: y, month: m, force });
      if (res.error) {
        notify.error(res.error);
        return;
      }
      notify.success("Payroll generated.");
      router.refresh();
    });
  }

  function setStatus(status: PayrollRunStatus) {
    if (!data.run) return;
    startTransition(async () => {
      const res = await setPayrollRunStatus(data.run!.id, status);
      if (res.error) {
        notify.error(res.error);
        return;
      }
      notify.success(`Payroll marked ${status.toLowerCase()}.`);
      router.refresh();
    });
  }

  function waiveFine(fineId: string) {
    startTransition(async () => {
      const res = await waiveStaffFine(fineId, "Waived from payroll dashboard");
      if (res.error) {
        notify.error(res.error);
        return;
      }
      notify.success("Fine waived.");
      router.refresh();
    });
  }

  function exportCsv() {
    const blob = new Blob([toCsv(data)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${data.month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const run = data.run;
  const s = data.stats;

  const kpi = [
    {
      id: "pending" as const,
      label: "Pending salary",
      value: formatCurrency(s.pendingSalaryAmount),
      sub: `${s.pendingSalaryCount} lines unpaid`,
      icon: Clock3,
    },
    {
      id: "paid" as const,
      label: "Paid salary (range)",
      value: formatCurrency(s.paidSalaryAmount),
      sub: `${s.paidSalaryCount} payments`,
      icon: Banknote,
    },
    {
      id: "fines" as const,
      label: "Fines due (open)",
      value: formatCurrency(s.openFinesAmount),
      sub: `${s.openFinesCount} open · ${s.waivedFinesCount} waived`,
      icon: Scale,
    },
    {
      id: "absent" as const,
      label: "Absences / leave",
      value: String(s.absenceRecords),
      sub: `Today not in: ${s.todayAbsent}`,
      icon: CalendarX2,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border bg-muted/20 p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="payroll_month">Pay month (generate)</Label>
            <Input
              id="payroll_month"
              type="month"
              value={month}
              onChange={(e) => changeMonth(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payroll_from">From</Label>
            <Input
              id="payroll_from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payroll_to">To</Label>
            <Input
              id="payroll_to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button type="button" variant="outline" onClick={applyRange}>
              Apply range
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => selectView("all")}
              className="text-muted-foreground"
            >
              Reset view
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage ? (
            <>
              <Button
                type="button"
                disabled={pending}
                onClick={() => generate(Boolean(run))}
              >
                {run ? "Regenerate draft" : "Generate payroll"}
              </Button>
              {run?.status === "DRAFT" ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setStatus("REVIEWED")}
                >
                  Mark reviewed
                </Button>
              ) : null}
              {run?.status === "REVIEWED" ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setStatus("APPROVED")}
                >
                  Approve
                </Button>
              ) : null}
              {run?.status === "APPROVED" ? (
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() => setStatus("PAID")}
                >
                  Record as paid
                </Button>
              ) : null}
            </>
          ) : null}
          {run ? (
            <Button type="button" variant="outline" onClick={exportCsv}>
              Export CSV
            </Button>
          ) : null}
          <Button type="button" variant="outline" render={<Link href="/attendance" />}>
            Attendance
          </Button>
          <Button type="button" variant="outline" render={<Link href="/finances" />}>
            Finances
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpi.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectView(item.id)}
              className={cn(
                "rounded-xl border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-primary/[0.03]",
                active && "border-primary ring-1 ring-primary/30"
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </p>
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold tabular-nums">{item.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.sub}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Users className="size-3.5" /> Active staff
            </CardDescription>
            <CardTitle className="text-2xl">{s.totalStaff}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {s.monthlyStaff} monthly · {s.hourlyStaff} hourly · {s.unconfiguredStaff}{" "}
            unconfigured
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Today&apos;s attendance</CardDescription>
            <CardTitle className="text-2xl">{s.todayPresent}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {s.todayAbsent} not checked in · {s.pendingApprovals} pending approvals
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gross / deductions</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(run?.total_gross ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Deductions {formatCurrency(run?.total_deductions ?? 0)} · Applied fines{" "}
            {formatCurrency(s.appliedFinesAmount)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net payroll</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(run?.total_net ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            Status{" "}
            {run ? (
              <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
            ) : (
              <span>Not generated</span>
            )}
          </CardContent>
        </Card>
      </div>

      {(view === "all" || view === "warnings") && data.warnings.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-amber-600" />
              Warnings &amp; alerts
            </CardTitle>
            <CardDescription>
              Things that need attention before you pay. Click a card above to focus one
              area.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.warnings.map((w) => (
              <div
                key={w.id}
                className={cn(
                  "flex flex-wrap items-start justify-between gap-2 rounded-lg border px-3 py-2 text-sm",
                  w.severity === "warn"
                    ? "border-amber-200/80 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20"
                    : "bg-muted/30"
                )}
              >
                <div>
                  <p className="font-medium">{w.title}</p>
                  <p className="text-xs text-muted-foreground">{w.detail}</p>
                </div>
                {w.href ? (
                  <Button type="button" size="sm" variant="outline" render={<Link href={w.href} />}>
                    Open
                  </Button>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {(view === "all" || view === "fines") && (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">Fines &amp; late charges</CardTitle>
                <CardDescription>
                  {data.from} → {data.to}
                  {view === "fines" ? " · open fines only" : ""}
                </CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => selectView("fines")}
              >
                Focus
              </Button>
            </CardHeader>
            <CardContent>
              {shownFines.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No fines in this range.
                </p>
              ) : (
                <ul className="space-y-2">
                  {shownFines.map((f) => (
                    <li
                      key={f.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/staff/${f.staff_id}`}
                          className="font-medium underline-offset-2 hover:underline"
                        >
                          {f.staff_name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {f.work_date} · {f.reason}
                          {f.minutes_late != null ? ` · ${f.minutes_late}m late` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold tabular-nums">
                          {formatCurrency(f.amount)}
                        </span>
                        <Badge variant="outline">{f.status}</Badge>
                        {canManage && f.status === "OPEN" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() => waiveFine(f.id)}
                          >
                            Waive
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {(view === "all" || view === "paid" || view === "pending") && (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">Salary &amp; staff payments</CardTitle>
                <CardDescription>
                  Payments dated {data.from} → {data.to}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => selectView("paid")}
                >
                  Paid
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => selectView("pending")}
                >
                  Pending
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {view === "pending" ? (
                unpaidPreview(data, filteredLines)
              ) : shownPayments.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No staff payments in this range.
                </p>
              ) : (
                <ul className="space-y-2">
                  {shownPayments.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                    >
                      <div>
                        <Link
                          href={`/staff/${p.staff_id}`}
                          className="font-medium underline-offset-2 hover:underline"
                        >
                          {p.staff_name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {p.payment_date} · {p.payment_type}
                          {p.notes ? ` · ${p.notes}` : ""}
                        </p>
                      </div>
                      <span className="font-semibold tabular-nums">
                        {formatCurrency(p.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {(view === "all" || view === "absent") && (
          <Card className={view === "absent" ? "xl:col-span-2" : undefined}>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">Absences, leave &amp; half-days</CardTitle>
                <CardDescription>Day overrides in selected range</CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => selectView("absent")}
              >
                Focus
              </Button>
            </CardHeader>
            <CardContent>
              {shownAbsences.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No absence/leave day records in this range.
                </p>
              ) : (
                <ul className="space-y-2">
                  {shownAbsences.map((a) => (
                    <li
                      key={`${a.staff_id}-${a.work_date}-${a.status}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                    >
                      <div>
                        <Link
                          href={`/staff/${a.staff_id}`}
                          className="font-medium underline-offset-2 hover:underline"
                        >
                          {a.staff_name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{a.work_date}</p>
                      </div>
                      <Badge variant="outline">{a.status.replace("_", " ")}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {!run ? (
        <Card>
          <CardHeader>
            <CardTitle>No payroll for {data.month}</CardTitle>
            <CardDescription>
              Configure monthly or hourly pay on staff profiles, then generate a draft
              run from attendance, advances, and late fines.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" render={<Link href="/staff" />}>
              Open staff roster
            </Button>
            {canManage ? (
              <Button type="button" disabled={pending} onClick={() => generate(false)}>
                Generate payroll
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-muted-foreground" />
                Monthly payroll lines
              </CardTitle>
              <CardDescription>
                {run.period_start} → {run.period_end} · {run.staff_count} staff ·{" "}
                {run.total_regular_hours}h regular · {run.total_overtime_hours}h OT
                {view === "pending" ? " · showing unpaid only" : ""}
                {view === "paid" ? " · showing paid lines only" : ""}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Search name, ID, dept…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-48"
              />
              <select
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                value={payFilter}
                onChange={(e) =>
                  setPayFilter(e.target.value as "ALL" | "MONTHLY" | "HOURLY")
                }
              >
                <option value="ALL">All pay types</option>
                <option value="MONTHLY">Monthly</option>
                <option value="HOURLY">Hourly</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {filteredLines.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No matching staff lines.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Present</TableHead>
                    <TableHead className="text-right">Absent</TableHead>
                    <TableHead className="text-right">Regular h</TableHead>
                    <TableHead className="text-right">OT h</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-xs">
                        {l.employee_code ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/staff/${l.staff_id}`}
                          className="font-medium underline-offset-2 hover:underline"
                        >
                          {l.staff_name}
                        </Link>
                      </TableCell>
                      <TableCell>{l.pay_type}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(l.base_rate)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {l.days_present}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {l.days_absent}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {l.regular_hours}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {l.overtime_hours}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(l.gross_earnings)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(l.total_deductions)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(l.net_pay)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {l.payment_id ? "PAID" : run.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function unpaidPreview(
  data: PayrollDashboardData,
  lines: PayrollDashboardData["lines"]
) {
  if (!data.run) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Generate payroll for {data.month} to see pending salary lines.
      </p>
    );
  }
  if (lines.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No unpaid salary lines — all paid or net is zero.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {lines.map((l) => (
        <li
          key={l.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
        >
          <div>
            <Link
              href={`/staff/${l.staff_id}`}
              className="font-medium underline-offset-2 hover:underline"
            >
              {l.staff_name}
            </Link>
            <p className="text-xs text-muted-foreground">
              Run {data.run?.status} · absent {l.days_absent}d
            </p>
          </div>
          <span className="font-semibold tabular-nums">{formatCurrency(l.net_pay)}</span>
        </li>
      ))}
    </ul>
  );
}
