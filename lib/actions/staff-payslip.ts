"use server";

import { requireOrganization } from "@/lib/auth/organization";
import { canAccessFeature } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { getLinkedStaffProfile } from "@/lib/staff/linked-profile";
import { getAttendancePolicy, listStaffFines } from "@/lib/actions/staff-fines";
import type { StaffFineRow, AttendancePolicy } from "@/lib/actions/staff-fines";

export type StaffPayslipPayment = {
  id: string;
  amount: number;
  paymentType: string;
  paymentDate: string;
  notes: string | null;
};

export type StaffPayslipBundle = {
  staffId: string;
  yearMonth: string;
  isSelfView: boolean;
  canManageFines: boolean;
  canManagePay: boolean;
  salary: {
    payType: "MONTHLY" | "HOURLY" | null;
    monthlySalary: number | null;
    hourlyRate: number | null;
    salaryPolicy: string | null;
    employeeCode: string | null;
    department: string | null;
    dutyStart: string | null;
    dutyEnd: string | null;
    expectedHoursPerDay: number;
    overtimeEligible: boolean;
    overtimeMultiplier: number;
  };
  policy: AttendancePolicy;
  payroll: {
    runStatus: string | null;
    periodStart: string | null;
    periodEnd: string | null;
    baseRate: number;
    daysPresent: number;
    daysAbsent: number;
    regularHours: number;
    overtimeHours: number;
    regularEarnings: number;
    overtimeEarnings: number;
    grossEarnings: number;
    advances: number;
    otherDeductions: number;
    totalDeductions: number;
    netPay: number;
    lateDays: number;
    finedLateDays: number;
    graceLateDays: number;
    lateFineTotal: number;
    breakdownNotes: string[];
  } | null;
  /** All recorded payments this month (bonus, advance, salary, partial). */
  payments: StaffPayslipPayment[];
  paymentTotals: {
    bonus: number;
    advance: number;
    salary: number;
    partial: number;
    other: number;
    all: number;
  };
  fines: StaffFineRow[];
};

export async function getStaffPayslipBundle(
  staffId: string,
  yearMonth: string
): Promise<StaffPayslipBundle | null> {
  const org = await requireOrganization();
  const canBrowseStaff = await canAccessFeature("staff");
  const linked = await getLinkedStaffProfile();
  const isSelfView = linked?.id === staffId;
  if (!canBrowseStaff && !isSelfView) return null;

  const supabase = await createClient();
  const [y, m] = yearMonth.split("-").map(Number);
  const periodStart = `${yearMonth}-01`;
  const periodEnd = `${yearMonth}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;

  const { data: staff } = await supabase
    .from("staff")
    .select(
      `id, pay_type, monthly_salary, hourly_rate, salary_policy, employee_code, department,
       schedule_start_time, schedule_end_time, expected_hours_per_day,
       overtime_eligible, overtime_multiplier`
    )
    .eq("id", staffId)
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!staff) return null;

  const [policy, fines, { data: run }, { data: paymentRows }, canManagePay] =
    await Promise.all([
      getAttendancePolicy(),
      listStaffFines({ staffId, from: periodStart, to: periodEnd }),
      supabase
        .from("payroll_runs")
        .select("id, status, period_start, period_end")
        .eq("organization_id", org.organizationId)
        .eq("period_year", y)
        .eq("period_month", m)
        .maybeSingle(),
      supabase
        .from("staff_payments")
        .select("id, amount, payment_type, payment_date, notes")
        .eq("organization_id", org.organizationId)
        .eq("staff_id", staffId)
        .gte("payment_date", periodStart)
        .lte("payment_date", periodEnd)
        .order("payment_date", { ascending: false }),
      canAccessFeature("finances").catch(() => false),
    ]);

  const payments: StaffPayslipPayment[] = (paymentRows ?? []).map((p) => ({
    id: p.id,
    amount: Number(p.amount),
    paymentType: p.payment_type,
    paymentDate: p.payment_date,
    notes: p.notes,
  }));

  const paymentTotals = {
    bonus: 0,
    advance: 0,
    salary: 0,
    partial: 0,
    other: 0,
    all: 0,
  };
  for (const p of payments) {
    paymentTotals.all += p.amount;
    if (p.paymentType === "BONUS") paymentTotals.bonus += p.amount;
    else if (p.paymentType === "ADVANCE") paymentTotals.advance += p.amount;
    else if (p.paymentType === "SALARY") paymentTotals.salary += p.amount;
    else if (p.paymentType === "PARTIAL") paymentTotals.partial += p.amount;
    else paymentTotals.other += p.amount;
  }

  let payroll: StaffPayslipBundle["payroll"] = null;
  if (run) {
    const { data: line } = await supabase
      .from("payroll_run_lines")
      .select(
        `base_rate, days_present, days_absent, regular_hours, overtime_hours,
         regular_earnings, overtime_earnings, gross_earnings, advances,
         other_deductions, total_deductions, net_pay, breakdown`
      )
      .eq("payroll_run_id", run.id)
      .eq("staff_id", staffId)
      .maybeSingle();

    if (line) {
      const breakdown = (line.breakdown ?? {}) as Record<string, unknown>;
      payroll = {
        runStatus: run.status,
        periodStart: run.period_start,
        periodEnd: run.period_end,
        baseRate: Number(line.base_rate),
        daysPresent: Number(line.days_present),
        daysAbsent: Number(line.days_absent),
        regularHours: Number(line.regular_hours),
        overtimeHours: Number(line.overtime_hours),
        regularEarnings: Number(line.regular_earnings),
        overtimeEarnings: Number(line.overtime_earnings),
        grossEarnings: Number(line.gross_earnings),
        advances: Number(line.advances),
        otherDeductions: Number(line.other_deductions),
        totalDeductions: Number(line.total_deductions),
        netPay: Number(line.net_pay),
        lateDays: Number(breakdown.lateDays ?? 0),
        finedLateDays: Number(breakdown.finedLateDays ?? 0),
        graceLateDays: Number(breakdown.graceLateDays ?? 0),
        lateFineTotal: Number(breakdown.lateFineTotal ?? 0),
        breakdownNotes: Array.isArray(breakdown.notes)
          ? (breakdown.notes as string[])
          : [],
      };
    }
  }

  return {
    staffId,
    yearMonth,
    isSelfView,
    canManageFines: Boolean(canManagePay),
    canManagePay: Boolean(canManagePay),
    salary: {
      payType: (staff.pay_type as "MONTHLY" | "HOURLY" | null) ?? null,
      monthlySalary:
        staff.monthly_salary != null ? Number(staff.monthly_salary) : null,
      hourlyRate: staff.hourly_rate != null ? Number(staff.hourly_rate) : null,
      salaryPolicy: staff.salary_policy,
      employeeCode: staff.employee_code,
      department: staff.department,
      dutyStart: staff.schedule_start_time
        ? String(staff.schedule_start_time).slice(0, 5)
        : policy.default_duty_start,
      dutyEnd: staff.schedule_end_time
        ? String(staff.schedule_end_time).slice(0, 5)
        : policy.default_duty_end,
      expectedHoursPerDay: Number(staff.expected_hours_per_day ?? 8),
      overtimeEligible: Boolean(staff.overtime_eligible),
      overtimeMultiplier: Number(staff.overtime_multiplier ?? 1.5),
    },
    policy,
    payroll,
    payments,
    paymentTotals,
    fines,
  };
}
