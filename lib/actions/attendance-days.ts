"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAction } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/commerce";
import type { AttendanceDayStatus } from "@/lib/payroll/types";

const STATUS = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "HALF_DAY",
  "ON_LEAVE",
  "HOLIDAY",
  "WEEKLY_OFF",
] as const;

const daySchema = z.object({
  staff_id: z.string().uuid(),
  work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(STATUS),
  payable_hours: z.coerce.number().min(0).max(24).optional(),
  notes: z.string().max(500).optional(),
});

export type AttendanceDayRow = {
  id: string;
  staff_id: string;
  work_date: string;
  status: AttendanceDayStatus;
  payable_hours: number | null;
  notes: string | null;
  staff_name?: string | null;
};

/** Upsert a day-level attendance status override (leave, holiday, half day, etc.). */
export async function upsertAttendanceDay(
  input: z.infer<typeof daySchema>
): Promise<ActionResult> {
  const org = await requireAction("attendance.manage");
  const parsed = daySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid attendance day" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("staff_attendance_days").upsert(
    {
      organization_id: org.organizationId,
      staff_id: parsed.data.staff_id,
      work_date: parsed.data.work_date,
      status: parsed.data.status as AttendanceDayStatus,
      payable_hours: parsed.data.payable_hours ?? null,
      notes: parsed.data.notes?.trim() || null,
      created_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "staff_id,work_date" }
  );

  if (error) return { error: error.message };
  revalidatePath("/attendance");
  revalidatePath("/payroll");
  revalidatePath(`/staff/${parsed.data.staff_id}`);
  revalidatePath("/staff");
  return { success: true };
}

/**
 * Form action: assign holiday / leave for one staff or all active staff (national day).
 * scope = "one" | "all"
 * kind  = "HOLIDAY" (paid) | "ON_LEAVE" (unpaid) | "ABSENT" | "HALF_DAY"
 */
export async function assignStaffDayOff(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const org = await requireAction("attendance.manage");
  const scope = String(formData.get("scope") ?? "one");
  const staffId = String(formData.get("staff_id") ?? "").trim();
  const workDate = String(formData.get("work_date") ?? "").trim();
  const status = String(formData.get("status") ?? "HOLIDAY").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
    return { error: "Choose a valid date." };
  }
  if (!STATUS.includes(status as (typeof STATUS)[number])) {
    return { error: "Invalid day type." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let staffIds: string[] = [];
  if (scope === "all") {
    const { data: staffRows, error } = await supabase
      .from("staff")
      .select("id")
      .eq("organization_id", org.organizationId)
      .eq("is_active", true)
      .is("deleted_at", null);
    if (error) return { error: error.message };
    staffIds = (staffRows ?? []).map((s) => s.id);
    if (!staffIds.length) return { error: "No active staff to assign." };
  } else {
    if (!staffId) return { error: "Choose a staff member." };
    staffIds = [staffId];
  }

  const rows = staffIds.map((id) => ({
    organization_id: org.organizationId,
    staff_id: id,
    work_date: workDate,
    status: status as AttendanceDayStatus,
    payable_hours: null as number | null,
    notes: notes || null,
    created_by: user?.id ?? null,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("staff_attendance_days")
    .upsert(rows, { onConflict: "staff_id,work_date" });

  if (error) return { error: error.message };

  revalidatePath("/attendance");
  revalidatePath("/payroll");
  revalidatePath("/staff");
  for (const id of staffIds.slice(0, 20)) {
    revalidatePath(`/staff/${id}`);
  }
  return {
    success: true,
    message:
      scope === "all"
        ? `Assigned ${status.replace("_", " ").toLowerCase()} on ${workDate} to ${staffIds.length} staff.`
        : `Saved ${status.replace("_", " ").toLowerCase()} for ${workDate}.`,
  };
}

export async function deleteAttendanceDay(
  dayId: string,
  staffId?: string
): Promise<ActionResult> {
  const org = await requireAction("attendance.manage");
  if (!dayId) return { error: "Missing day." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("staff_attendance_days")
    .delete()
    .eq("id", dayId)
    .eq("organization_id", org.organizationId);
  if (error) return { error: error.message };
  revalidatePath("/attendance");
  revalidatePath("/payroll");
  if (staffId) revalidatePath(`/staff/${staffId}`);
  revalidatePath("/staff");
  return { success: true };
}

export async function listAttendanceDays(opts?: {
  staffId?: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<AttendanceDayRow[]> {
  const org = await requireAction("attendance.manage");
  const supabase = await createClient();
  let q = supabase
    .from("staff_attendance_days")
    .select("id, staff_id, work_date, status, payable_hours, notes, staff:staff_id(full_name)")
    .eq("organization_id", org.organizationId)
    .order("work_date", { ascending: false })
    .limit(opts?.limit ?? 60);

  if (opts?.staffId) q = q.eq("staff_id", opts.staffId);
  if (opts?.from) q = q.gte("work_date", opts.from);
  if (opts?.to) q = q.lte("work_date", opts.to);

  const { data, error } = await q;
  if (error) return [];
  return (data ?? []).map((row) => {
    const staffRel = row.staff as { full_name?: string } | { full_name?: string }[] | null;
    const name = Array.isArray(staffRel)
      ? staffRel[0]?.full_name
      : staffRel?.full_name;
    return {
      id: row.id,
      staff_id: row.staff_id,
      work_date: row.work_date,
      status: row.status as AttendanceDayStatus,
      payable_hours: row.payable_hours != null ? Number(row.payable_hours) : null,
      notes: row.notes,
      staff_name: name ?? null,
    };
  });
}
