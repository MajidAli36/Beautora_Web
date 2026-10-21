"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StaffPayslipBundle } from "@/lib/actions/staff-payslip";
import { waiveStaffFine } from "@/lib/actions/staff-fines";
import { formatCurrency, formatDate } from "@/lib/format";
import { STAFF_PAYMENT_TYPE_LABELS, type StaffPaymentType } from "@/lib/finances/categories";
import {
  hourlyFromMonthly,
  monthlyFromHourly,
} from "@/lib/payroll/rate-math";
import { notify } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { StaffQuickPayForm } from "@/components/features/payroll/staff-quick-pay-form";

function paymentTypeLabel(type: string) {
  return (
    STAFF_PAYMENT_TYPE_LABELS[type as StaffPaymentType] ?? type
  );
}

function fineStatusBadge(status: string) {
  if (status === "WAIVED") return "secondary" as const;
  if (status === "APPLIED") return "default" as const;
  return "outline" as const;
}

export function StaffPayslipInvoice({
  bundle,
  staffName,
}: {
  bundle: StaffPayslipBundle;
  staffName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { salary, policy, payroll, fines, payments, paymentTotals } = bundle;

  const hoursPerDay = salary.expectedHoursPerDay || 8;
  const daysPerWeek = salary.expectedDaysPerWeek || 6;
  const displayHourly =
    salary.payType === "HOURLY" && (salary.hourlyRate ?? 0) > 0
      ? Number(salary.hourlyRate)
      : salary.payType === "MONTHLY" && (salary.monthlySalary ?? 0) > 0
        ? hourlyFromMonthly(
            Number(salary.monthlySalary),
            hoursPerDay,
            daysPerWeek
          )
        : Number(salary.hourlyRate ?? 0) ||
          hourlyFromMonthly(
            Number(salary.monthlySalary ?? 0),
            hoursPerDay,
            daysPerWeek
          );
  const displayMonthly =
    salary.payType === "MONTHLY" && (salary.monthlySalary ?? 0) > 0
      ? Number(salary.monthlySalary)
      : salary.payType === "HOURLY" && (salary.hourlyRate ?? 0) > 0
        ? monthlyFromHourly(
            Number(salary.hourlyRate),
            hoursPerDay,
            daysPerWeek
          )
        : Number(salary.monthlySalary ?? 0) ||
          monthlyFromHourly(
            Number(salary.hourlyRate ?? 0),
            hoursPerDay,
            daysPerWeek
          );

  function onWaive(fineId: string) {
    startTransition(async () => {
      const res = await waiveStaffFine(fineId, "Waived by owner/manager");
      if (res.error) {
        notify.error(res.error);
        return;
      }
      notify.success("Fine waived.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Card className="border-2 print:border">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardDescription>
                {bundle.isSelfView ? "My salary invoice" : "Staff salary invoice"}
              </CardDescription>
              <CardTitle className="text-xl">{staffName}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {salary.employeeCode ? `ID ${salary.employeeCode} · ` : ""}
                {salary.department ? `${salary.department} · ` : ""}
                Period {bundle.yearMonth}
              </p>
            </div>
            {payroll?.runStatus ? (
              <Badge variant="outline">{payroll.runStatus}</Badge>
            ) : (
              <Badge variant="secondary">Payroll pending</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Payment type
              </p>
              <p className="mt-1 font-semibold">
                {salary.payType === "HOURLY"
                  ? "Hourly wage"
                  : salary.payType === "MONTHLY"
                    ? "Monthly salary"
                    : "Not configured"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Monthly
              </p>
              <p className="mt-1 font-semibold tabular-nums">
                {salary.payType
                  ? formatCurrency(displayMonthly)
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {salary.payType === "HOURLY" ? "Equivalent from hourly" : "Base salary"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Hourly
              </p>
              <p className="mt-1 font-semibold tabular-nums">
                {salary.payType
                  ? `${formatCurrency(displayHourly)} / hr`
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {salary.payType === "MONTHLY"
                  ? "Auto from monthly ÷ duty hours"
                  : "Wage rate"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Duty time
              </p>
              <p className="mt-1 font-semibold">
                {salary.dutyStart ?? "—"} – {salary.dutyEnd ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {salary.expectedHoursPerDay}h / day · {daysPerWeek}d / week
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Late grace policy
              </p>
              <p className="mt-1 text-sm font-medium">
                {policy.late_grace_minutes} min grace ·{" "}
                {policy.late_allowed_days_per_month} free late days / month
              </p>
              <p className="text-xs text-muted-foreground">
                Fine after allowance: {formatCurrency(policy.late_fine_amount)}
              </p>
            </div>
          </div>

          {payroll ? (
            <div className="rounded-lg border">
              <div className="border-b bg-muted/20 px-4 py-2 text-sm font-semibold">
                Earnings & deductions
              </div>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell>Days present</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {payroll.daysPresent}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Days absent</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {payroll.daysAbsent}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Regular hours</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {payroll.regularHours}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Overtime hours</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {payroll.overtimeHours}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Regular earnings</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(payroll.regularEarnings)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Overtime earnings</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(payroll.overtimeEarnings)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      Gross
                      {paymentTotals.bonus > 0
                        ? " (includes bonuses below)"
                        : ""}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(payroll.grossEarnings)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Advances</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">
                      −{formatCurrency(payroll.advances)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      Late fines ({payroll.finedLateDays} fined ·{" "}
                      {payroll.graceLateDays} within grace · {payroll.lateDays}{" "}
                      late total)
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">
                      −{formatCurrency(payroll.lateFineTotal)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Other deductions</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">
                      −
                      {formatCurrency(
                        Math.max(0, payroll.otherDeductions - payroll.lateFineTotal)
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-base font-semibold">
                      Net payable
                    </TableCell>
                    <TableCell className="text-right text-base font-semibold tabular-nums">
                      {formatCurrency(payroll.netPay)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              {payroll.breakdownNotes.length > 0 ? (
                <ul className="space-y-1 border-t px-4 py-3 text-xs text-muted-foreground">
                  {payroll.breakdownNotes.map((n) => (
                    <li key={n}>• {n}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              No payroll run for this month yet. Owners generate it from Payroll.
              Your attendance, warnings, and salary config still appear below.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {bundle.isSelfView ? "My bonuses & payments" : "Bonuses & payments"}
          </CardTitle>
          <CardDescription>
            Bonus, advance, salary, and partial payments recorded this month — visible to
            staff on their own login.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div className="rounded-md border px-3 py-2">
              <p className="text-xs text-muted-foreground">Bonuses</p>
              <p className="font-semibold tabular-nums">
                {formatCurrency(paymentTotals.bonus)}
              </p>
            </div>
            <div className="rounded-md border px-3 py-2">
              <p className="text-xs text-muted-foreground">Advances</p>
              <p className="font-semibold tabular-nums">
                {formatCurrency(paymentTotals.advance)}
              </p>
            </div>
            <div className="rounded-md border px-3 py-2">
              <p className="text-xs text-muted-foreground">Salary paid</p>
              <p className="font-semibold tabular-nums">
                {formatCurrency(paymentTotals.salary + paymentTotals.partial)}
              </p>
            </div>
            <div className="rounded-md border px-3 py-2">
              <p className="text-xs text-muted-foreground">All payments</p>
              <p className="font-semibold tabular-nums">
                {formatCurrency(paymentTotals.all)}
              </p>
            </div>
          </div>

          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No bonus or payment recorded this month yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.paymentDate)}</TableCell>
                    <TableCell>
                      <Badge variant={p.paymentType === "BONUS" ? "default" : "outline"}>
                        {paymentTypeLabel(p.paymentType)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                      {p.notes || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(p.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {bundle.canManagePay ? (
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="mb-3 text-sm font-medium">Give bonus / record payment</p>
              <StaffQuickPayForm
                staffId={bundle.staffId}
                staffName={staffName}
                yearMonth={bundle.yearMonth}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Late fines this month</CardTitle>
          <CardDescription>
            After {policy.late_allowed_days_per_month} late day(s) with{" "}
            {policy.late_grace_minutes} min grace, each extra late day is fined{" "}
            {formatCurrency(policy.late_fine_amount)}. Owners can waive OPEN fines.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fines recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Late</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  {bundle.canManageFines ? <TableHead /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {fines.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{formatDate(f.work_date)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {f.minutes_late != null ? `${f.minutes_late} min` : "—"}
                      {f.grace_minutes != null
                        ? ` (grace ${f.grace_minutes}m)`
                        : ""}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatCurrency(f.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={fineStatusBadge(f.status)}>{f.status}</Badge>
                    </TableCell>
                    {bundle.canManageFines ? (
                      <TableCell className="text-right">
                        {f.status === "OPEN" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() => onWaive(f.id)}
                          >
                            Waive
                          </Button>
                        ) : f.waive_note ? (
                          <span className="text-xs text-muted-foreground">
                            {f.waive_note}
                          </span>
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
