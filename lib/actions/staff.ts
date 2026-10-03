"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAction } from "@/lib/auth/permissions";
import { requireOrganization } from "@/lib/auth/organization";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/commerce";

const staffSchema = z.object({
  full_name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  job_title: z.string().optional(),
  pin_code: z.string().optional(),
});

export async function createStaff(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const org = await requireAction("staff.create");
  const parsed = staffSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    job_title: formData.get("job_title") || undefined,
    pin_code: formData.get("pin_code") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.from("staff").insert({
    organization_id: org.organizationId,
    full_name: parsed.data.full_name,
    phone: parsed.data.phone ?? null,
    email: parsed.data.email || null,
    job_title: parsed.data.job_title ?? null,
    pin_code: parsed.data.pin_code ?? null,
    online_booking_enabled: true,
  });
  if (error) return { error: error.message };
  revalidatePath("/staff");
  revalidatePath("/attendance");
  revalidatePath("/online-booking");
  revalidatePath("/appointments");
  return { success: true };
}

export async function setStaffActive(
  staffId: string,
  isActive: boolean
): Promise<ActionResult> {
  const org = await requireAction("staff.edit");
  const supabase = await createClient();

  const { error } = await supabase
    .from("staff")
    .update(
      isActive
        ? { is_active: true }
        : { is_active: false, online_booking_enabled: false }
    )
    .eq("id", staffId)
    .eq("organization_id", org.organizationId);

  if (error) return { error: error.message };
  revalidatePath("/staff");
  revalidatePath("/attendance");
  revalidatePath("/pos");
  revalidatePath("/appointments");
  revalidatePath("/online-booking");
  return { success: true };
}

export async function deleteStaff(staffId: string): Promise<ActionResult> {
  const org = await requireAction("staff.delete");
  const supabase = await createClient();

  const { data: staff } = await supabase
    .from("staff")
    .select("id, full_name, email, phone, job_title")
    .eq("id", staffId)
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!staff) return { error: "Staff not found" };

  await supabase
    .from("staff_attendance")
    .update({ check_out_at: new Date().toISOString() })
    .eq("staff_id", staffId)
    .eq("organization_id", org.organizationId)
    .is("check_out_at", null);

  const { resolveSoftDeleteActor, softDeleteEntity } = await import("@/lib/db/soft-delete");
  const actor = await resolveSoftDeleteActor();
  const result = await softDeleteEntity({
    table: "staff",
    id: staffId,
    organizationId: org.organizationId,
    actor,
    action: "staff.delete",
    entityType: "staff",
    summary: `Deleted staff ${staff.full_name}`,
    before: staff as unknown as Record<string, unknown>,
    extraPatch: { is_active: false, online_booking_enabled: false },
  });

  if (result.error) return { error: result.error };

  revalidatePath("/staff");
  revalidatePath("/attendance");
  revalidatePath("/pos");
  revalidatePath("/appointments");
  revalidatePath("/online-booking");
  revalidatePath("/finances");
  return { success: true };
}

const MANUAL_BACKDATE_MAX_DAYS = 7;
const MANUAL_FUTURE_SLACK_MS = 5 * 60 * 1000;

function parseManualAt(value: string | null | undefined, label: string): Date | { error: string } {
  if (!value?.trim()) return new Date();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { error: `Invalid ${label}` };
  const now = Date.now();
  if (parsed.getTime() > now + MANUAL_FUTURE_SLACK_MS) {
    return { error: `${label} cannot be in the future` };
  }
  const oldest = now - MANUAL_BACKDATE_MAX_DAYS * 24 * 60 * 60 * 1000;
  if (parsed.getTime() < oldest) {
    return { error: `${label} cannot be more than ${MANUAL_BACKDATE_MAX_DAYS} days ago` };
  }
  return parsed;
}

export type ManualAttendanceOptions = {
  /** Actual check-in or check-out time (ISO / datetime-local). Defaults to now. */
  at?: string | null;
  /** For recording a completed past shift during outages */
  checkInAt?: string | null;
  checkOutAt?: string | null;
};

export async function recordManualAttendance(
  staffId: string,
  action: "in" | "out" | "session",
  options: ManualAttendanceOptions = {}
): Promise<ActionResult> {
  const org = await requireAction("attendance.manage");
  const supabase = await createClient();

  const { data: staff } = await supabase
    .from("staff")
    .select("id, full_name, is_active")
    .eq("organization_id", org.organizationId)
    .eq("id", staffId)
    .maybeSingle();

  if (!staff) return { error: "Staff not found" };
  if (!staff.is_active) return { error: "Staff is inactive" };

  const { data: open } = await supabase
    .from("staff_attendance")
    .select("id, check_in_at")
    .eq("staff_id", staffId)
    .eq("organization_id", org.organizationId)
    .is("check_out_at", null)
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (action === "session") {
    if (open) {
      return { error: `${staff.full_name} is already checked in — check out first` };
    }
    const checkIn = parseManualAt(options.checkInAt, "Check-in time");
    if ("error" in checkIn) return checkIn;
    const checkOut = parseManualAt(options.checkOutAt, "Check-out time");
    if ("error" in checkOut) return checkOut;
    if (checkOut.getTime() <= checkIn.getTime()) {
      return { error: "Check-out must be after check-in" };
    }
    const maxShiftMs = 18 * 60 * 60 * 1000;
    if (checkOut.getTime() - checkIn.getTime() > maxShiftMs) {
      return { error: "Shift cannot exceed 18 hours" };
    }

    const { error } = await supabase.from("staff_attendance").insert({
      organization_id: org.organizationId,
      staff_id: staffId,
      method: "MANUAL",
      check_in_at: checkIn.toISOString(),
      check_out_at: checkOut.toISOString(),
      notes: "Backdated manual shift (power/internet recovery)",
    });
    if (error) return { error: error.message };
  } else if (action === "in") {
    if (open) return { error: `${staff.full_name} is already checked in` };
    const at = parseManualAt(options.at, "Check-in time");
    if ("error" in at) return at;

    const { error } = await supabase.from("staff_attendance").insert({
      organization_id: org.organizationId,
      staff_id: staffId,
      method: "MANUAL",
      check_in_at: at.toISOString(),
      notes: options.at?.trim()
        ? "Manual check-in with adjusted time"
        : null,
    });
    if (error) return { error: error.message };
  } else {
    if (!open) return { error: `${staff.full_name} has no open check-in` };
    const at = parseManualAt(options.at, "Check-out time");
    if ("error" in at) return at;
    const openIn = new Date(open.check_in_at).getTime();
    if (at.getTime() <= openIn) {
      return { error: "Check-out must be after the current check-in time" };
    }

    const { error } = await supabase
      .from("staff_attendance")
      .update(
        options.at?.trim()
          ? {
              check_out_at: at.toISOString(),
              notes: "Manual check-out with adjusted time",
            }
          : { check_out_at: at.toISOString() }
      )
      .eq("id", open.id);
    if (error) return { error: error.message };
  }

  revalidatePath("/staff");
  revalidatePath("/attendance");
  return { success: true };
}

export async function getStaff() {
  const org = await requireOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .order("full_name");
  if (error) throw new Error(error.message);
  return data;
}

export async function getStaffAttendance(limit = 30) {
  const org = await requireOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff_attendance")
    .select("*, staff:staff(id, full_name)")
    .eq("organization_id", org.organizationId)
    .order("check_in_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data as unknown as {
    id: string;
    check_in_at: string;
    check_out_at: string | null;
    method: string;
    staff: { id: string; full_name: string } | null;
  }[];
}

export async function getStaffOnDuty() {
  const org = await requireOrganization();
  const supabase = await createClient();
  const { data } = await supabase
    .from("staff_attendance")
    .select("staff_id")
    .eq("organization_id", org.organizationId)
    .is("check_out_at", null);
  return new Set((data ?? []).map((r) => r.staff_id));
}

const thumbSchema = z.object({
  staff_id: z.string().uuid(),
  thumb_id: z.string().min(1, "Thumb ID required").max(64),
});

export async function enrollStaffThumb(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const org = await requireAction("staff.edit");
  const parsed = thumbSchema.safeParse({
    staff_id: formData.get("staff_id"),
    thumb_id: formData.get("thumb_id"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const thumbId = parsed.data.thumb_id.trim();

  // Allow numeric / short ZK user IDs typed manually. Block only website-invented prefixes.
  if (/^web-/i.test(thumbId)) {
    return {
      error: "Invalid ID. Use the ZK User ID from the machine menu (e.g. 1 or 2).",
    };
  }

  const { data: existing } = await supabase
    .from("staff")
    .select("id, full_name")
    .eq("organization_id", org.organizationId)
    .eq("thumb_id", thumbId)
    .maybeSingle();

  if (existing && existing.id !== parsed.data.staff_id) {
    return { error: `This thumb is already enrolled for ${existing.full_name}` };
  }

  const { error } = await supabase
    .from("staff")
    .update({
      thumb_id: thumbId,
      thumb_enrolled_at: new Date().toISOString(),
    })
    .eq("organization_id", org.organizationId)
    .eq("id", parsed.data.staff_id);

  if (error) return { error: error.message };
  revalidatePath("/staff");
  revalidatePath("/attendance");
  return { success: true };
}

export async function removeStaffThumb(staffId: string): Promise<ActionResult> {
  const org = await requireAction("staff.edit");
  const supabase = await createClient();
  const { error } = await supabase
    .from("staff")
    .update({ thumb_id: null, thumb_enrolled_at: null })
    .eq("organization_id", org.organizationId)
    .eq("id", staffId);
  if (error) return { error: error.message };
  revalidatePath("/staff");
  revalidatePath("/attendance");
  return { success: true };
}

/**
 * Thumb attendance (primary path).
 *
 * action "toggle" (default for scanners / kiosk / Press thumb):
 *   - no open session → check_in
 *   - open session    → check_out (+ durationMinutes)
 *
 * Explicit check_in / check_out used when the device reports in/out mode.
 * externalKey makes device sync idempotent (safe while receptionist is on any screen).
 */
export async function recordThumbAttendance(
  thumbId: string,
  action: "toggle" | "check_in" | "check_out" = "toggle",
  atIso?: string | null,
  externalKey?: string | null
): Promise<
  ActionResult & {
    action?: "check_in" | "check_out";
    staffName?: string;
    staffId?: string;
    at?: string;
    durationMinutes?: number;
    deduped?: boolean;
  }
> {
  const org = await requireAction("attendance.manage");
  const id = thumbId.trim();
  if (!id) return { error: "Thumb ID required" };

  const supabase = await createClient();
  const { data: staff } = await supabase
    .from("staff")
    .select("id, full_name, is_active")
    .eq("organization_id", org.organizationId)
    .eq("thumb_id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (!staff) {
    return { error: "Thumb not enrolled — register thumb for this staff first" };
  }

  const { data: open } = await supabase
    .from("staff_attendance")
    .select("id, check_in_at")
    .eq("staff_id", staff.id)
    .eq("organization_id", org.organizationId)
    .is("check_out_at", null)
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let resolved: "check_in" | "check_out" =
    action === "toggle" ? (open ? "check_out" : "check_in") : action;

  const at = atIso?.trim() ? new Date(atIso) : new Date();
  if (Number.isNaN(at.getTime())) return { error: "Invalid punch time" };
  const iso = at.toISOString();
  const key = externalKey?.trim() || null;
  const notes = key ? `sdk:${key}` : `sdk-web:${id}`;

  if (key) {
    const { data: prior } = await supabase
      .from("staff_attendance")
      .select("id, check_in_at, check_out_at")
      .eq("organization_id", org.organizationId)
      .eq("staff_id", staff.id)
      .eq("notes", notes)
      .maybeSingle();
    if (prior) {
      const durationMinutes =
        prior.check_out_at && prior.check_in_at
          ? Math.max(
              0,
              Math.round(
                (new Date(prior.check_out_at).getTime() -
                  new Date(prior.check_in_at).getTime()) /
                  60000
              )
            )
          : undefined;
      return {
        success: true,
        action: prior.check_out_at ? "check_out" : "check_in",
        staffName: staff.full_name,
        staffId: staff.id,
        at: prior.check_out_at ?? prior.check_in_at,
        durationMinutes,
        deduped: true,
      };
    }
  }

  if (resolved === "check_in") {
    if (open) return { error: `${staff.full_name} is already checked in` };
    const { error } = await supabase.from("staff_attendance").insert({
      organization_id: org.organizationId,
      staff_id: staff.id,
      method: "BIOMETRIC",
      check_in_at: iso,
      notes,
    });
    if (error) return { error: error.message };
    revalidatePath("/attendance");
    return {
      success: true,
      action: "check_in",
      staffName: staff.full_name,
      staffId: staff.id,
      at: iso,
    };
  }

  if (!open) return { error: `${staff.full_name} has no open check-in` };
  if (at.getTime() <= new Date(open.check_in_at).getTime()) {
    return { error: "Check-out must be after the current check-in time" };
  }

  const { error } = await supabase
    .from("staff_attendance")
    .update({ check_out_at: iso, notes })
    .eq("id", open.id);
  if (error) return { error: error.message };

  const durationMinutes = Math.max(
    0,
    Math.round((at.getTime() - new Date(open.check_in_at).getTime()) / 60000)
  );

  revalidatePath("/attendance");
  return {
    success: true,
    action: "check_out",
    staffName: staff.full_name,
    staffId: staff.id,
    at: iso,
    durationMinutes,
  };
}

/**
 * Batch ingest from the live device watcher (receptionist can be on any screen).
 * Uses the same 1st=in / 2nd=out toggle rules + idempotency keys.
 */
export async function ingestThumbPunches(
  punches: Array<{
    thumbId: string;
    at?: string;
    action?: "toggle" | "check_in" | "check_out";
    externalKey?: string;
  }>
): Promise<{
  applied: number;
  skipped: number;
  results: Array<{
    thumbId: string;
    ok: boolean;
    action?: string;
    staffName?: string;
    durationMinutes?: number;
    error?: string;
    deduped?: boolean;
  }>;
}> {
  const results: Array<{
    thumbId: string;
    ok: boolean;
    action?: string;
    staffName?: string;
    durationMinutes?: number;
    error?: string;
    deduped?: boolean;
  }> = [];
  let applied = 0;
  let skipped = 0;

  for (const punch of punches) {
    const result = await recordThumbAttendance(
      punch.thumbId,
      punch.action ?? "toggle",
      punch.at,
      punch.externalKey
    );
    if (result.error) {
      skipped++;
      results.push({ thumbId: punch.thumbId, ok: false, error: result.error });
      continue;
    }
    if (result.deduped) {
      skipped++;
      results.push({
        thumbId: punch.thumbId,
        ok: true,
        action: result.action,
        staffName: result.staffName,
        durationMinutes: result.durationMinutes,
        deduped: true,
      });
      continue;
    }
    applied++;
    results.push({
      thumbId: punch.thumbId,
      ok: true,
      action: result.action,
      staffName: result.staffName,
      durationMinutes: result.durationMinutes,
    });
  }

  return { applied, skipped, results };
}
