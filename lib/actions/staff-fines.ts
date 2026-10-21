"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAction } from "@/lib/auth/permissions";
import { requireOrganization } from "@/lib/auth/organization";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/commerce";

export type StaffFineRow = {
  id: string;
  staff_id: string;
  staff_name: string;
  work_date: string;
  reason: string;
  amount: number;
  status: "OPEN" | "WAIVED" | "APPLIED";
  minutes_late: number | null;
  grace_minutes: number | null;
  notes: string | null;
  waived_at: string | null;
  waive_note: string | null;
};

export type AttendancePolicy = {
  late_grace_minutes: number;
  late_allowed_days_per_month: number;
  late_fine_amount: number;
  default_duty_start: string;
  default_duty_end: string;
};

const policySchema = z.object({
  late_grace_minutes: z.coerce.number().int().min(0).max(240),
  late_allowed_days_per_month: z.coerce.number().int().min(0).max(31),
  late_fine_amount: z.coerce.number().min(0),
  default_duty_start: z.string().min(4),
  default_duty_end: z.string().min(4),
});

async function requirePolicyManage() {
  try {
    return await requireAction("settings.manage");
  } catch {
    return await requireAction("finances.create");
  }
}

export async function getAttendancePolicy(): Promise<AttendancePolicy> {
  const org = await requireOrganization();
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select(
      "late_grace_minutes, late_allowed_days_per_month, late_fine_amount, default_duty_start, default_duty_end"
    )
    .eq("id", org.organizationId)
    .maybeSingle();

  return {
    late_grace_minutes: Number(data?.late_grace_minutes ?? 15),
    late_allowed_days_per_month: Number(data?.late_allowed_days_per_month ?? 3),
    late_fine_amount: Number(data?.late_fine_amount ?? 0),
    default_duty_start: String(data?.default_duty_start ?? "10:00").slice(0, 5),
    default_duty_end: String(data?.default_duty_end ?? "20:00").slice(0, 5),
  };
}

export async function updateAttendancePolicy(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const org = await requirePolicyManage();
  const parsed = policySchema.safeParse({
    late_grace_minutes: formData.get("late_grace_minutes"),
    late_allowed_days_per_month: formData.get("late_allowed_days_per_month"),
    late_fine_amount: formData.get("late_fine_amount"),
    default_duty_start: String(formData.get("default_duty_start") ?? "10:00"),
    default_duty_end: String(formData.get("default_duty_end") ?? "20:00"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid policy" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      late_grace_minutes: parsed.data.late_grace_minutes,
      late_allowed_days_per_month: parsed.data.late_allowed_days_per_month,
      late_fine_amount: parsed.data.late_fine_amount,
      default_duty_start: parsed.data.default_duty_start,
      default_duty_end: parsed.data.default_duty_end,
    })
    .eq("id", org.organizationId);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath("/payroll");
  revalidatePath("/staff");
  return { success: true };
}

export async function listStaffFines(opts: {
  staffId?: string;
  from?: string;
  to?: string;
}): Promise<StaffFineRow[]> {
  const org = await requireOrganization();
  const supabase = await createClient();

  let query = supabase
    .from("staff_fines")
    .select(
      `
      id, staff_id, work_date, reason, amount, status,
      minutes_late, grace_minutes, notes, waived_at, waive_note,
      staff:staff(full_name)
    `
    )
    .eq("organization_id", org.organizationId)
    .order("work_date", { ascending: false });

  if (opts.staffId) query = query.eq("staff_id", opts.staffId);
  if (opts.from) query = query.gte("work_date", opts.from);
  if (opts.to) query = query.lte("work_date", opts.to);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const staff = row.staff as unknown as { full_name: string } | null;
    return {
      id: row.id,
      staff_id: row.staff_id,
      staff_name: staff?.full_name ?? "Staff",
      work_date: row.work_date,
      reason: row.reason,
      amount: Number(row.amount),
      status: row.status as StaffFineRow["status"],
      minutes_late: row.minutes_late,
      grace_minutes: row.grace_minutes,
      notes: row.notes,
      waived_at: row.waived_at,
      waive_note: row.waive_note,
    };
  });
}

export async function waiveStaffFine(
  fineId: string,
  waiveNote?: string
): Promise<ActionResult> {
  const org = await requireAction("finances.create");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: fine } = await supabase
    .from("staff_fines")
    .select("id, staff_id, status")
    .eq("id", fineId)
    .eq("organization_id", org.organizationId)
    .maybeSingle();

  if (!fine) return { error: "Fine not found" };
  if (fine.status === "WAIVED") return { error: "Already waived" };
  if (fine.status === "APPLIED") {
    return { error: "Fine already applied to a paid payroll — record an adjustment payment instead" };
  }

  const { error } = await supabase
    .from("staff_fines")
    .update({
      status: "WAIVED",
      waived_by: user?.id ?? null,
      waived_at: new Date().toISOString(),
      waive_note: waiveNote?.trim() || "Waived by owner/manager",
    })
    .eq("id", fineId)
    .eq("organization_id", org.organizationId);

  if (error) return { error: error.message };
  revalidatePath("/payroll");
  revalidatePath(`/staff/${fine.staff_id}`);
  return { success: true };
}
