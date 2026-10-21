"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAction } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/commerce";
import type { StaffPayType, StaffSalaryPolicy } from "@/lib/payroll/types";

const compensationSchema = z
  .object({
    staff_id: z.string().uuid(),
    employee_code: z.string().max(64).optional().or(z.literal("")),
    department: z.string().max(120).optional().or(z.literal("")),
    pay_type: z.enum(["MONTHLY", "HOURLY"]),
    monthly_salary: z.coerce.number().min(0).optional(),
    hourly_rate: z.coerce.number().min(0).optional(),
    expected_hours_per_day: z.coerce.number().min(0.5).max(24).default(8),
    expected_days_per_week: z.coerce.number().min(0.5).max(7).default(6),
    break_minutes_per_day: z.coerce.number().int().min(0).max(480).default(0),
    break_paid: z.coerce.boolean().default(false),
    overtime_eligible: z.coerce.boolean().default(false),
    overtime_multiplier: z.coerce.number().min(1).max(5).default(1.5),
    salary_policy: z.enum(["FIXED", "ATTENDANCE_ADJUSTED"]).default("FIXED"),
    weekly_off_days: z.string().optional(), // comma-separated 0-6
    schedule_start_time: z.string().optional().or(z.literal("")),
    schedule_end_time: z.string().optional().or(z.literal("")),
    salary_effective_from: z.string().optional().or(z.literal("")),
    hired_on: z.string().optional().or(z.literal("")),
    left_on: z.string().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.pay_type === "MONTHLY" && (data.monthly_salary == null || data.monthly_salary < 0)) {
      ctx.addIssue({
        code: "custom",
        message: "Monthly salary is required",
        path: ["monthly_salary"],
      });
    }
    if (data.pay_type === "HOURLY" && (data.hourly_rate == null || data.hourly_rate < 0)) {
      ctx.addIssue({
        code: "custom",
        message: "Hourly rate is required",
        path: ["hourly_rate"],
      });
    }
  });

/**
 * Parse weekly offs from the form.
 * Empty / "none" = work all 7 days (no weekly off). Do NOT default to Sunday.
 */
function parseWeeklyOffs(raw?: string): number[] {
  const t = raw?.trim() ?? "";
  if (!t || t === "none" || t === "__none__") return [];
  const days = t
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  return [...new Set(days)].sort((a, b) => a - b);
}

function emptyToNull(v?: string) {
  const t = v?.trim();
  return t ? t : null;
}

export type StaffCompensationRow = {
  id: string;
  full_name: string;
  employee_code: string | null;
  department: string | null;
  job_title: string | null;
  is_active: boolean;
  pay_type: StaffPayType | null;
  monthly_salary: number | null;
  hourly_rate: number | null;
  expected_hours_per_day: number;
  expected_days_per_week: number;
  break_minutes_per_day: number;
  break_paid: boolean;
  overtime_eligible: boolean;
  overtime_multiplier: number;
  salary_policy: StaffSalaryPolicy;
  weekly_off_days: number[];
  schedule_start_time: string | null;
  schedule_end_time: string | null;
  salary_effective_from: string | null;
  hired_on: string | null;
  left_on: string | null;
};

export async function updateStaffCompensation(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const org = await requireAction("staff.edit");
  const bool = (key: string) => {
    const v = formData.get(key);
    return v === "on" || v === "true" || v === "1";
  };

  const parsed = compensationSchema.safeParse({
    staff_id: formData.get("staff_id"),
    employee_code: String(formData.get("employee_code") ?? ""),
    department: String(formData.get("department") ?? ""),
    pay_type: formData.get("pay_type"),
    monthly_salary: formData.get("monthly_salary") || 0,
    hourly_rate: formData.get("hourly_rate") || 0,
    expected_hours_per_day: formData.get("expected_hours_per_day") || 8,
    expected_days_per_week: formData.get("expected_days_per_week") || 6,
    break_minutes_per_day: formData.get("break_minutes_per_day") || 0,
    break_paid: bool("break_paid"),
    overtime_eligible: bool("overtime_eligible"),
    overtime_multiplier: formData.get("overtime_multiplier") || 1.5,
    salary_policy: formData.get("salary_policy") || "FIXED",
    weekly_off_days: String(formData.get("weekly_off_days") ?? "none"),
    schedule_start_time: String(formData.get("schedule_start_time") ?? ""),
    schedule_end_time: String(formData.get("schedule_end_time") ?? ""),
    salary_effective_from: String(formData.get("salary_effective_from") ?? ""),
    hired_on: String(formData.get("hired_on") ?? ""),
    left_on: String(formData.get("left_on") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid compensation" };
  }

  const d = parsed.data;
  const weeklyOff = parseWeeklyOffs(d.weekly_off_days);
  const { syncPayRates } = await import("@/lib/payroll/rate-math");
  // Always keep monthly + hourly in sync so overtime / hour views work for both modes.
  const synced = syncPayRates({
    payType: d.pay_type,
    monthlySalary: d.monthly_salary ?? 0,
    hourlyRate: d.hourly_rate ?? 0,
    hoursPerDay: d.expected_hours_per_day,
    daysPerWeek: d.expected_days_per_week,
  });
  const supabase = await createClient();

  const patch = {
    employee_code: emptyToNull(d.employee_code),
    department: emptyToNull(d.department),
    pay_type: d.pay_type,
    monthly_salary: synced.monthlySalary,
    hourly_rate: synced.hourlyRate,
    expected_hours_per_day: d.expected_hours_per_day,
    expected_days_per_week: d.expected_days_per_week,
    break_minutes_per_day: d.break_minutes_per_day,
    break_paid: d.break_paid,
    overtime_eligible: d.overtime_eligible,
    overtime_multiplier: d.overtime_multiplier,
    salary_policy: d.salary_policy,
    weekly_off_days: weeklyOff,
    schedule_start_time: emptyToNull(d.schedule_start_time),
    schedule_end_time: emptyToNull(d.schedule_end_time),
    salary_effective_from: emptyToNull(d.salary_effective_from),
    hired_on: emptyToNull(d.hired_on),
    left_on: emptyToNull(d.left_on),
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error } = await supabase
    .from("staff")
    .update(patch)
    .eq("id", d.staff_id)
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!updated) return { error: "Staff not found" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("staff_salary_history").insert({
    organization_id: org.organizationId,
    staff_id: d.staff_id,
    pay_type: d.pay_type,
    monthly_salary: patch.monthly_salary,
    hourly_rate: patch.hourly_rate,
    expected_hours_per_day: d.expected_hours_per_day,
    expected_days_per_week: d.expected_days_per_week,
    break_minutes_per_day: d.break_minutes_per_day,
    break_paid: d.break_paid,
    overtime_eligible: d.overtime_eligible,
    overtime_multiplier: d.overtime_multiplier,
    salary_policy: d.salary_policy,
    weekly_off_days: weeklyOff,
    effective_from: patch.salary_effective_from ?? new Date().toISOString().slice(0, 10),
    changed_by: user?.id ?? null,
    notes: emptyToNull(d.notes),
  });

  revalidatePath("/staff");
  revalidatePath(`/staff/${d.staff_id}`);
  revalidatePath("/payroll");
  return { success: true };
}
