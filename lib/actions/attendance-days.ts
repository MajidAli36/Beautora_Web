"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAction } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/commerce";
import type { AttendanceDayStatus } from "@/lib/payroll/types";

const daySchema = z.object({
  staff_id: z.string().uuid(),
  work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum([
    "PRESENT",
    "ABSENT",
    "LATE",
    "HALF_DAY",
    "ON_LEAVE",
    "HOLIDAY",
    "WEEKLY_OFF",
  ]),
  payable_hours: z.coerce.number().min(0).max(24).optional(),
  notes: z.string().max(500).optional(),
});

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
  return { success: true };
}
