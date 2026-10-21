"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAction } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { fetchAllPages } from "@/lib/supabase/paginate";
import { endOfLocalDay, startOfLocalDay } from "@/lib/dates/local";
import {
  calculateStaffPayrollLine,
  periodBounds,
  sumPayrollLines,
} from "@/lib/payroll/calculate";
import type {
  AttendanceDayStatus,
  LateGracePolicy,
  PayrollRunStatus,
  StaffCompensation,
  StaffPayType,
  StaffSalaryPolicy,
} from "@/lib/payroll/types";
import type { ActionResult } from "@/types/commerce";

export type PayrollRunSummary = {
  id: string;
  period_year: number;
  period_month: number;
  period_start: string;
  period_end: string;
  status: PayrollRunStatus;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  total_regular_hours: number;
  total_overtime_hours: number;
  staff_count: number;
  generated_at: string;
  paid_at: string | null;
};

export type PayrollRunLineRow = {
  id: string;
  staff_id: string;
  staff_name: string;
  employee_code: string | null;
  department: string | null;
  pay_type: StaffPayType;
  salary_policy: StaffSalaryPolicy | null;
  base_rate: number;
  days_present: number;
  days_absent: number;
  regular_hours: number;
  overtime_hours: number;
  gross_earnings: number;
  total_deductions: number;
  net_pay: number;
  payment_id: string | null;
  breakdown: Record<string, unknown>;
};

export type PayrollFineRow = {
  id: string;
  staff_id: string;
  staff_name: string;
  work_date: string;
  reason: string;
  amount: number;
  status: "OPEN" | "WAIVED" | "APPLIED";
  minutes_late: number | null;
  notes: string | null;
};

export type PayrollPaymentRow = {
  id: string;
  staff_id: string;
  staff_name: string;
  amount: number;
  payment_type: string;
  payment_date: string;
  notes: string | null;
};

export type PayrollAbsenceRow = {
  staff_id: string;
  staff_name: string;
  work_date: string;
  status: string;
};

export type PayrollWarning = {
  id: string;
  severity: "warn" | "info";
  title: string;
  detail: string;
  href?: string;
};

export type PayrollDashboardData = {
  month: string;
  from: string;
  to: string;
  run: PayrollRunSummary | null;
  lines: PayrollRunLineRow[];
  fines: PayrollFineRow[];
  payments: PayrollPaymentRow[];
  absences: PayrollAbsenceRow[];
  warnings: PayrollWarning[];
  stats: {
    totalStaff: number;
    monthlyStaff: number;
    hourlyStaff: number;
    unconfiguredStaff: number;
    todayPresent: number;
    todayAbsent: number;
    pendingApprovals: number;
    openFinesCount: number;
    openFinesAmount: number;
    waivedFinesCount: number;
    appliedFinesAmount: number;
    paidSalaryAmount: number;
    paidSalaryCount: number;
    pendingSalaryAmount: number;
    pendingSalaryCount: number;
    absenceRecords: number;
  };
};

async function requirePayrollAccess() {
  try {
    return await requireAction("finances.create");
  } catch {
    return await requireAction("reports.view");
  }
}

function mapCompensation(row: {
  pay_type: string | null;
  monthly_salary: number | null;
  hourly_rate: number | null;
  expected_hours_per_day: number | null;
  expected_days_per_week: number | null;
  break_minutes_per_day: number | null;
  break_paid: boolean | null;
  overtime_eligible: boolean | null;
  overtime_multiplier: number | null;
  salary_policy: string | null;
  weekly_off_days: number[] | null;
  schedule_start_time?: string | null;
  schedule_end_time?: string | null;
  hired_on: string | null;
  left_on: string | null;
  salary_effective_from: string | null;
}): StaffCompensation | null {
  if (row.pay_type !== "MONTHLY" && row.pay_type !== "HOURLY") return null;
  return {
    payType: row.pay_type,
    monthlySalary: Number(row.monthly_salary ?? 0),
    hourlyRate: Number(row.hourly_rate ?? 0),
    expectedHoursPerDay: Number(row.expected_hours_per_day ?? 8),
    expectedDaysPerWeek: Number(row.expected_days_per_week ?? 6),
    breakMinutesPerDay: Number(row.break_minutes_per_day ?? 0),
    breakPaid: Boolean(row.break_paid),
    overtimeEligible: Boolean(row.overtime_eligible),
    overtimeMultiplier: Number(row.overtime_multiplier ?? 1.5),
    salaryPolicy: (row.salary_policy as StaffSalaryPolicy) || "FIXED",
    // Empty array = works every day. Only default Sunday when the column is null/missing.
    weeklyOffDays: Array.isArray(row.weekly_off_days)
      ? row.weekly_off_days
      : row.weekly_off_days == null
        ? [0]
        : [],
    scheduleStartTime: row.schedule_start_time ?? null,
    scheduleEndTime: row.schedule_end_time ?? null,
    hiredOn: row.hired_on,
    leftOn: row.left_on,
    salaryEffectiveFrom: row.salary_effective_from,
  };
}

async function loadLatePolicy(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string
): Promise<LateGracePolicy> {
  const { data } = await supabase
    .from("organizations")
    .select(
      "late_grace_minutes, late_allowed_days_per_month, late_fine_amount, default_duty_start, default_duty_end"
    )
    .eq("id", organizationId)
    .maybeSingle();
  return {
    graceMinutes: Number(data?.late_grace_minutes ?? 15),
    allowedLateDaysPerMonth: Number(data?.late_allowed_days_per_month ?? 3),
    fineAmount: Number(data?.late_fine_amount ?? 0),
    defaultDutyStart: String(data?.default_duty_start ?? "10:00").slice(0, 5),
    defaultDutyEnd: String(data?.default_duty_end ?? "20:00").slice(0, 5),
  };
}

export async function getPayrollDashboard(
  month: string,
  range?: { from?: string; to?: string }
): Promise<PayrollDashboardData> {
  const org = await requirePayrollAccess();
  const supabase = await createClient();

  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const periodMonth = Number(monthStr);
  const { start: monthStart, end: monthEnd } = periodBounds(year, periodMonth);

  const { getLocalDateString } = await import("@/lib/dates/local");
  const today = getLocalDateString();
  const from =
    range?.from && /^\d{4}-\d{2}-\d{2}$/.test(range.from) ? range.from : monthStart;
  const to = range?.to && /^\d{4}-\d{2}-\d{2}$/.test(range.to) ? range.to : monthEnd;
  const rangeStart = from <= to ? from : to;
  const rangeEnd = from <= to ? to : from;

  const [
    { data: staffRows },
    { data: runRow },
    { count: pendingApprovals },
    { data: todayRows },
    { data: fineRows },
    { data: paymentRows },
    { data: absenceRows },
  ] = await Promise.all([
    supabase
      .from("staff")
      .select("id, full_name, pay_type, is_active, deleted_at")
      .eq("organization_id", org.organizationId)
      .is("deleted_at", null)
      .eq("is_active", true),
    supabase
      .from("payroll_runs")
      .select("*")
      .eq("organization_id", org.organizationId)
      .eq("period_year", year)
      .eq("period_month", periodMonth)
      .maybeSingle(),
    supabase
      .from("staff_attendance")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org.organizationId)
      .eq("approved", false)
      .gte("check_in_at", startOfLocalDay(rangeStart).toISOString())
      .lte("check_in_at", endOfLocalDay(rangeEnd).toISOString()),
    supabase
      .from("staff_attendance")
      .select("staff_id")
      .eq("organization_id", org.organizationId)
      .gte("check_in_at", startOfLocalDay(today).toISOString())
      .lte("check_in_at", endOfLocalDay(today).toISOString()),
    supabase
      .from("staff_fines")
      .select(
        `
        id, staff_id, work_date, reason, amount, status, minutes_late, notes,
        staff:staff(full_name)
      `
      )
      .eq("organization_id", org.organizationId)
      .gte("work_date", rangeStart)
      .lte("work_date", rangeEnd)
      .order("work_date", { ascending: false }),
    supabase
      .from("staff_payments")
      .select(
        `
        id, staff_id, amount, payment_type, payment_date, notes,
        staff:staff(full_name)
      `
      )
      .eq("organization_id", org.organizationId)
      .gte("payment_date", rangeStart)
      .lte("payment_date", rangeEnd)
      .order("payment_date", { ascending: false }),
    supabase
      .from("staff_attendance_days")
      .select(
        `
        staff_id, work_date, status,
        staff:staff(full_name)
      `
      )
      .eq("organization_id", org.organizationId)
      .in("status", ["ABSENT", "ON_LEAVE", "HALF_DAY", "HOLIDAY"])
      .gte("work_date", rangeStart)
      .lte("work_date", rangeEnd)
      .order("work_date", { ascending: false }),
  ]);

  const active = staffRows ?? [];
  const staffName = new Map(active.map((s) => [s.id, s.full_name]));
  const todayPresentIds = new Set((todayRows ?? []).map((r) => r.staff_id));
  const todayPresent = todayPresentIds.size;
  const todayAbsent = Math.max(0, active.length - todayPresent);

  const fines: PayrollFineRow[] = (fineRows ?? []).map((row) => {
    const staff = row.staff as unknown as { full_name: string } | null;
    return {
      id: row.id,
      staff_id: row.staff_id,
      staff_name: staff?.full_name ?? staffName.get(row.staff_id) ?? "Staff",
      work_date: row.work_date,
      reason: row.reason,
      amount: Number(row.amount),
      status: row.status as PayrollFineRow["status"],
      minutes_late: row.minutes_late,
      notes: row.notes,
    };
  });

  const payments: PayrollPaymentRow[] = (paymentRows ?? []).map((row) => {
    const staff = row.staff as unknown as { full_name: string } | null;
    return {
      id: row.id,
      staff_id: row.staff_id,
      staff_name: staff?.full_name ?? staffName.get(row.staff_id) ?? "Staff",
      amount: Number(row.amount),
      payment_type: row.payment_type,
      payment_date: row.payment_date,
      notes: row.notes,
    };
  });

  const absences: PayrollAbsenceRow[] = (absenceRows ?? []).map((row) => {
    const staff = row.staff as unknown as { full_name: string } | null;
    return {
      staff_id: row.staff_id,
      staff_name: staff?.full_name ?? staffName.get(row.staff_id) ?? "Staff",
      work_date: row.work_date,
      status: row.status,
    };
  });

  let lines: PayrollRunLineRow[] = [];
  let run: PayrollRunSummary | null = null;

  if (runRow) {
    run = {
      id: runRow.id,
      period_year: runRow.period_year,
      period_month: runRow.period_month,
      period_start: runRow.period_start,
      period_end: runRow.period_end,
      status: runRow.status as PayrollRunStatus,
      total_gross: Number(runRow.total_gross),
      total_deductions: Number(runRow.total_deductions),
      total_net: Number(runRow.total_net),
      total_regular_hours: Number(runRow.total_regular_hours),
      total_overtime_hours: Number(runRow.total_overtime_hours),
      staff_count: runRow.staff_count,
      generated_at: runRow.generated_at,
      paid_at: runRow.paid_at,
    };

    const { data: lineRows } = await supabase
      .from("payroll_run_lines")
      .select(
        `
        id, staff_id, pay_type, salary_policy, base_rate,
        days_present, days_absent, regular_hours, overtime_hours,
        gross_earnings, total_deductions, net_pay, payment_id, breakdown,
        staff:staff(full_name, employee_code, department)
      `
      )
      .eq("payroll_run_id", runRow.id)
      .eq("organization_id", org.organizationId)
      .order("staff_id");

    lines = (lineRows ?? []).map((row) => {
      const staff = row.staff as unknown as {
        full_name: string;
        employee_code: string | null;
        department: string | null;
      } | null;
      return {
        id: row.id,
        staff_id: row.staff_id,
        staff_name: staff?.full_name ?? "Staff",
        employee_code: staff?.employee_code ?? null,
        department: staff?.department ?? null,
        pay_type: row.pay_type as StaffPayType,
        salary_policy: (row.salary_policy as StaffSalaryPolicy) ?? null,
        base_rate: Number(row.base_rate),
        days_present: Number(row.days_present),
        days_absent: Number(row.days_absent),
        regular_hours: Number(row.regular_hours),
        overtime_hours: Number(row.overtime_hours),
        gross_earnings: Number(row.gross_earnings),
        total_deductions: Number(row.total_deductions),
        net_pay: Number(row.net_pay),
        payment_id: row.payment_id,
        breakdown: (row.breakdown as Record<string, unknown>) ?? {},
      };
    });
  }

  const openFines = fines.filter((f) => f.status === "OPEN");
  const waivedFines = fines.filter((f) => f.status === "WAIVED");
  const appliedFines = fines.filter((f) => f.status === "APPLIED");
  const salaryPayments = payments.filter((p) => p.payment_type === "SALARY");
  const unpaidLines = lines.filter((l) => !l.payment_id && l.net_pay > 0);
  const pendingSalaryAmount =
    run && run.status !== "PAID"
      ? unpaidLines.reduce((s, l) => s + l.net_pay, 0)
      : unpaidLines.reduce((s, l) => s + l.net_pay, 0);
  const unconfigured = active.filter((s) => !s.pay_type);

  const warnings: PayrollWarning[] = [];
  if (unconfigured.length > 0) {
    warnings.push({
      id: "unconfigured",
      severity: "warn",
      title: `${unconfigured.length} staff without salary setup`,
      detail: "Set monthly/hourly pay on their profile or they won’t appear in payroll.",
      href: "/staff",
    });
  }
  if ((pendingApprovals ?? 0) > 0) {
    warnings.push({
      id: "pending-attendance",
      severity: "warn",
      title: `${pendingApprovals} attendance punches need approval`,
      detail: "Unapproved punches are skipped for hours and may affect late/pay math.",
      href: "/attendance",
    });
  }
  if (openFines.length > 0) {
    warnings.push({
      id: "open-fines",
      severity: "warn",
      title: `${openFines.length} open fines due`,
      detail: "Waive or include in the next payroll generate/pay cycle.",
    });
  }
  if (!run) {
    warnings.push({
      id: "no-run",
      severity: "info",
      title: `No payroll generated for ${month}`,
      detail: "Generate a draft when attendance for the month is ready.",
    });
  } else if (run.status !== "PAID" && unpaidLines.length > 0) {
    warnings.push({
      id: "pending-salary",
      severity: "info",
      title: `${unpaidLines.length} salary lines pending payment`,
      detail: `Status ${run.status}. Approve then mark Paid when ready.`,
    });
  }
  if (todayAbsent > 0) {
    warnings.push({
      id: "today-absent",
      severity: "info",
      title: `${todayAbsent} staff not checked in today`,
      detail: "Open Attendance to review or mark day overrides.",
      href: "/attendance",
    });
  }

  return {
    month,
    from: rangeStart,
    to: rangeEnd,
    run,
    lines,
    fines,
    payments,
    absences,
    warnings,
    stats: {
      totalStaff: active.length,
      monthlyStaff: active.filter((s) => s.pay_type === "MONTHLY").length,
      hourlyStaff: active.filter((s) => s.pay_type === "HOURLY").length,
      unconfiguredStaff: unconfigured.length,
      todayPresent,
      todayAbsent,
      pendingApprovals: pendingApprovals ?? 0,
      openFinesCount: openFines.length,
      openFinesAmount: openFines.reduce((s, f) => s + f.amount, 0),
      waivedFinesCount: waivedFines.length,
      appliedFinesAmount: appliedFines.reduce((s, f) => s + f.amount, 0),
      paidSalaryAmount: salaryPayments.reduce((s, p) => s + p.amount, 0),
      paidSalaryCount: salaryPayments.length,
      pendingSalaryAmount,
      pendingSalaryCount: unpaidLines.length,
      absenceRecords: absences.length,
    },
  };
}

const generateSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  force: z.coerce.boolean().optional(),
});

export async function generatePayrollRun(
  input: z.infer<typeof generateSchema>
): Promise<ActionResult & { runId?: string }> {
  const org = await requireAction("finances.create");
  const parsed = generateSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid period" };

  const { year, month, force } = parsed.data;
  const { start, end } = periodBounds(year, month);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("payroll_runs")
    .select("id, status")
    .eq("organization_id", org.organizationId)
    .eq("period_year", year)
    .eq("period_month", month)
    .maybeSingle();

  if (existing) {
    if (existing.status === "PAID" || existing.status === "APPROVED") {
      return {
        error: `Payroll for ${year}-${String(month).padStart(2, "0")} is ${existing.status.toLowerCase()} and cannot be recalculated. Create an adjustment payment instead.`,
      };
    }
    if (!force && existing.status !== "DRAFT") {
      return {
        error: `Payroll already exists as ${existing.status}. Pass force to regenerate draft/reviewed runs.`,
      };
    }
    // Delete draft/reviewed lines + run for regeneration
    await supabase
      .from("payroll_run_lines")
      .delete()
      .eq("payroll_run_id", existing.id)
      .eq("organization_id", org.organizationId);
    await supabase
      .from("payroll_runs")
      .delete()
      .eq("id", existing.id)
      .eq("organization_id", org.organizationId);
  }

  type StaffRow = {
    id: string;
    full_name: string;
    employee_code: string | null;
    department: string | null;
    pay_type: string | null;
    monthly_salary: number | null;
    hourly_rate: number | null;
    expected_hours_per_day: number | null;
    expected_days_per_week: number | null;
    break_minutes_per_day: number | null;
    break_paid: boolean | null;
    overtime_eligible: boolean | null;
    overtime_multiplier: number | null;
    salary_policy: string | null;
    weekly_off_days: number[] | null;
    schedule_start_time: string | null;
    schedule_end_time: string | null;
    hired_on: string | null;
    left_on: string | null;
    salary_effective_from: string | null;
  };

  const latePolicy = await loadLatePolicy(supabase, org.organizationId);

  const { data: staffList, error: staffErr } = await supabase
    .from("staff")
    .select(
      `id, full_name, employee_code, department, pay_type, monthly_salary, hourly_rate,
       expected_hours_per_day, expected_days_per_week, break_minutes_per_day, break_paid,
       overtime_eligible, overtime_multiplier, salary_policy, weekly_off_days,
       schedule_start_time, schedule_end_time,
       hired_on, left_on, salary_effective_from`
    )
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .eq("is_active", true);

  if (staffErr) return { error: staffErr.message };

  const configured = ((staffList ?? []) as StaffRow[]).filter(
    (s) => s.pay_type === "MONTHLY" || s.pay_type === "HOURLY"
  );
  if (configured.length === 0) {
    return {
      error: "No staff have salary configured. Set monthly or hourly pay on staff profiles first.",
    };
  }

  type SessionRaw = {
    staff_id: string;
    check_in_at: string;
    check_out_at: string | null;
    break_minutes: number | null;
    approved: boolean | null;
  };

  const sessions = await fetchAllPages<SessionRaw>((fromIdx, toIdx) =>
    supabase
      .from("staff_attendance")
      .select("staff_id, check_in_at, check_out_at, break_minutes, approved")
      .eq("organization_id", org.organizationId)
      .gte("check_in_at", startOfLocalDay(start).toISOString())
      .lte("check_in_at", endOfLocalDay(end).toISOString())
      .order("check_in_at", { ascending: true })
      .range(fromIdx, toIdx) as unknown as PromiseLike<{
      data: SessionRaw[] | null;
      error: { message: string } | null;
    }>
  );

  type DayRaw = {
    staff_id: string;
    work_date: string;
    status: string;
    payable_hours: number | null;
  };

  const { data: dayRows } = await supabase
    .from("staff_attendance_days")
    .select("staff_id, work_date, status, payable_hours")
    .eq("organization_id", org.organizationId)
    .gte("work_date", start)
    .lte("work_date", end);

  const { data: paymentAdjRows } = await supabase
    .from("staff_payments")
    .select("staff_id, amount, payment_type")
    .eq("organization_id", org.organizationId)
    .in("payment_type", ["ADVANCE", "BONUS"])
    .gte("payment_date", start)
    .lte("payment_date", end);

  const { data: fineRows } = await supabase
    .from("staff_fines")
    .select("staff_id, work_date, amount, status")
    .eq("organization_id", org.organizationId)
    .gte("work_date", start)
    .lte("work_date", end);

  const sessionsByStaff = new Map<string, SessionRaw[]>();
  for (const s of sessions) {
    const list = sessionsByStaff.get(s.staff_id) ?? [];
    list.push(s);
    sessionsByStaff.set(s.staff_id, list);
  }
  const daysByStaff = new Map<string, DayRaw[]>();
  for (const d of dayRows ?? []) {
    const list = daysByStaff.get(d.staff_id) ?? [];
    list.push(d);
    daysByStaff.set(d.staff_id, list);
  }
  const advancesByStaff = new Map<string, number>();
  const bonusByStaff = new Map<string, number>();
  for (const a of paymentAdjRows ?? []) {
    if (a.payment_type === "ADVANCE") {
      advancesByStaff.set(
        a.staff_id,
        (advancesByStaff.get(a.staff_id) ?? 0) + Number(a.amount)
      );
    } else if (a.payment_type === "BONUS") {
      bonusByStaff.set(
        a.staff_id,
        (bonusByStaff.get(a.staff_id) ?? 0) + Number(a.amount)
      );
    }
  }
  const waivedByStaff = new Map<string, string[]>();
  for (const f of fineRows ?? []) {
    if (f.status === "WAIVED") {
      const list = waivedByStaff.get(f.staff_id) ?? [];
      list.push(f.work_date);
      waivedByStaff.set(f.staff_id, list);
    }
  }

  const lines = [];
  for (const staff of configured) {
    const compensation = mapCompensation(staff);
    if (!compensation) continue;
    const staffSessions = sessionsByStaff.get(staff.id) ?? [];
    const overrides = (daysByStaff.get(staff.id) ?? []).map((d) => ({
      workDate: d.work_date,
      status: d.status as AttendanceDayStatus,
      payableHours: d.payable_hours,
    }));
    const result = calculateStaffPayrollLine(
      {
        staffId: staff.id,
        staffName: staff.full_name,
        employeeCode: staff.employee_code,
        department: staff.department,
        compensation,
        sessions: staffSessions.map((s) => ({
          checkInAt: s.check_in_at,
          checkOutAt: s.check_out_at,
          breakMinutes: s.break_minutes ?? undefined,
          approved: s.approved !== false,
        })),
        dayOverrides: overrides,
        advances: advancesByStaff.get(staff.id) ?? 0,
        // Paid BONUS staff_payments must NOT enter otherEarnings (would double-pay on PAID).
        otherEarnings: 0,
        alreadyPaidBonus: bonusByStaff.get(staff.id) ?? 0,
        latePolicy,
        waivedFineDates: waivedByStaff.get(staff.id) ?? [],
        openFineAmount: undefined,
      },
      start,
      end
    );
    if (result) lines.push(result);
  }

  const totals = sumPayrollLines(lines);

  const { data: run, error: runErr } = await supabase
    .from("payroll_runs")
    .insert({
      organization_id: org.organizationId,
      period_year: year,
      period_month: month,
      period_start: start,
      period_end: end,
      status: "DRAFT",
      total_gross: totals.totalGross,
      total_deductions: totals.totalDeductions,
      total_net: totals.totalNet,
      total_regular_hours: totals.totalRegularHours,
      total_overtime_hours: totals.totalOvertimeHours,
      staff_count: totals.staffCount,
      generated_by: user?.id ?? null,
      generated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (runErr) return { error: runErr.message };

  if (lines.length > 0) {
    const { error: lineErr } = await supabase.from("payroll_run_lines").insert(
      lines.map((l) => ({
        organization_id: org.organizationId,
        payroll_run_id: run.id,
        staff_id: l.staffId,
        pay_type: l.payType,
        salary_policy: l.salaryPolicy,
        base_rate: l.baseRate,
        days_present: l.daysPresent,
        days_absent: l.daysAbsent,
        days_leave: l.daysLeave,
        expected_working_days: l.expectedWorkingDays,
        regular_hours: l.regularHours,
        overtime_hours: l.overtimeHours,
        regular_earnings: l.regularEarnings,
        overtime_earnings: l.overtimeEarnings,
        other_earnings: l.otherEarnings,
        gross_earnings: l.grossEarnings,
        advances: l.advances,
        other_deductions: l.otherDeductions,
        total_deductions: l.totalDeductions,
        net_pay: l.netPay,
        breakdown: {
          ...l.breakdown,
          lateFines: l.lateFines,
          lateFineTotal: l.lateFineTotal,
        },
      }))
    );
    if (lineErr) {
      await supabase.from("payroll_runs").delete().eq("id", run.id);
      return { error: lineErr.message };
    }

    // Replace OPEN late fines for this period so regenerate cannot leave orphans
    // that get marked APPLIED on pay without being deducted from net.
    await supabase
      .from("staff_fines")
      .delete()
      .eq("organization_id", org.organizationId)
      .eq("reason", "LATE")
      .eq("status", "OPEN")
      .gte("work_date", start)
      .lte("work_date", end);

    const fineUpserts = lines.flatMap((l) =>
      l.lateFines
        .filter((f) => f.beyondAllowance && f.amount > 0)
        .map((f) => ({
          organization_id: org.organizationId,
          staff_id: l.staffId,
          work_date: f.workDate,
          reason: "LATE" as const,
          amount: f.amount,
          status: "OPEN" as const,
          minutes_late: f.minutesLate,
          grace_minutes: f.graceMinutes,
          notes: `Late #${f.lateOccurrence} this month (beyond ${latePolicy.allowedLateDaysPerMonth}-day grace)`,
          payroll_run_id: run.id,
          created_by: user?.id ?? null,
        }))
    );
    if (fineUpserts.length > 0) {
      for (const fine of fineUpserts) {
        const waived = (waivedByStaff.get(fine.staff_id) ?? []).includes(
          fine.work_date
        );
        if (waived) continue;
        const { data: existingFine } = await supabase
          .from("staff_fines")
          .select("id, status")
          .eq("staff_id", fine.staff_id)
          .eq("work_date", fine.work_date)
          .eq("reason", "LATE")
          .maybeSingle();
        if (
          existingFine?.status === "WAIVED" ||
          existingFine?.status === "APPLIED"
        ) {
          continue;
        }
        await supabase.from("staff_fines").upsert(fine, {
          onConflict: "staff_id,work_date,reason",
        });
      }
    }
  }

  revalidatePath("/payroll");
  revalidatePath("/finances");
  revalidatePath("/staff");
  return { success: true, runId: run.id };
}

export async function setPayrollRunStatus(
  runId: string,
  status: PayrollRunStatus
): Promise<ActionResult> {
  const org = await requireAction("finances.create");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: run } = await supabase
    .from("payroll_runs")
    .select("id, status")
    .eq("id", runId)
    .eq("organization_id", org.organizationId)
    .maybeSingle();

  if (!run) return { error: "Payroll run not found" };
  if (run.status === "PAID") return { error: "Paid payroll cannot change status" };

  const allowed: Record<string, PayrollRunStatus[]> = {
    DRAFT: ["REVIEWED", "DRAFT"],
    REVIEWED: ["APPROVED", "DRAFT"],
    APPROVED: ["PAID", "REVIEWED"],
    PAID: [],
  };
  if (!allowed[run.status]?.includes(status) && status !== run.status) {
    return { error: `Cannot move payroll from ${run.status} to ${status}` };
  }

  const patch: Record<string, unknown> = { status };
  if (status === "REVIEWED") {
    patch.reviewed_by = user?.id ?? null;
    patch.reviewed_at = new Date().toISOString();
  }
  if (status === "APPROVED") {
    patch.approved_by = user?.id ?? null;
    patch.approved_at = new Date().toISOString();
  }
  if (status === "PAID") {
    patch.paid_by = user?.id ?? null;
    patch.paid_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("payroll_runs")
    .update(patch)
    .eq("id", runId)
    .eq("organization_id", org.organizationId);

  if (error) return { error: error.message };

  // When marking paid, create staff_payments for unpaid lines
  if (status === "PAID") {
    const { data: lines } = await supabase
      .from("payroll_run_lines")
      .select("id, staff_id, net_pay, payment_id")
      .eq("payroll_run_id", runId)
      .eq("organization_id", org.organizationId);

    const { data: runFull } = await supabase
      .from("payroll_runs")
      .select("period_start, period_end")
      .eq("id", runId)
      .maybeSingle();

    const { createExpenseForStaffPayment } = await import(
      "@/lib/finances/staff-payment-expense"
    );
    const staffNameById = new Map<string, string>();
    {
      const ids = [...new Set((lines ?? []).map((l) => l.staff_id))];
      if (ids.length) {
        const { data: names } = await supabase
          .from("staff")
          .select("id, full_name")
          .eq("organization_id", org.organizationId)
          .in("id", ids);
        for (const n of names ?? []) staffNameById.set(n.id, n.full_name);
      }
    }

    for (const line of lines ?? []) {
      if (line.payment_id || Number(line.net_pay) <= 0) continue;
      const payDate =
        runFull?.period_end ?? new Date().toISOString().slice(0, 10);
      const { data: payment, error: payErr } = await supabase
        .from("staff_payments")
        .insert({
          organization_id: org.organizationId,
          staff_id: line.staff_id,
          amount: line.net_pay,
          payment_type: "SALARY",
          payment_method: "CASH",
          payment_date: payDate,
          period_start: runFull?.period_start ?? null,
          period_end: runFull?.period_end ?? null,
          amount_due: line.net_pay,
          notes: `Payroll run ${runId}`,
          created_by: user?.id ?? null,
        })
        .select("id")
        .single();
      if (payErr) return { error: payErr.message };

      const exp = await createExpenseForStaffPayment(supabase as never, {
        organizationId: org.organizationId,
        staffPaymentId: payment.id,
        staffId: line.staff_id,
        staffName: staffNameById.get(line.staff_id),
        amount: Number(line.net_pay),
        paymentType: "SALARY",
        paymentMethod: "CASH",
        paymentDate: payDate,
        notes: `Payroll run ${runId}`,
        createdBy: user?.id ?? null,
      });
      if (exp.error) return { error: exp.error };

      await supabase
        .from("payroll_run_lines")
        .update({ payment_id: payment.id })
        .eq("id", line.id);
    }

    // Only mark fines created for this run as APPLIED (already deducted in net).
    await supabase
      .from("staff_fines")
      .update({ status: "APPLIED" })
      .eq("organization_id", org.organizationId)
      .eq("status", "OPEN")
      .eq("payroll_run_id", runId);
  }

  revalidatePath("/payroll");
  revalidatePath("/finances");
  return { success: true };
}

export async function getStaffCompensation(staffId: string) {
  const org = await requireAction("staff.edit");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff")
    .select(
      `id, full_name, employee_code, department, job_title, is_active, pay_type,
       monthly_salary, hourly_rate, expected_hours_per_day, expected_days_per_week,
       break_minutes_per_day, break_paid, overtime_eligible, overtime_multiplier,
       salary_policy, weekly_off_days, schedule_start_time, schedule_end_time,
       salary_effective_from, hired_on, left_on`
    )
    .eq("id", staffId)
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
