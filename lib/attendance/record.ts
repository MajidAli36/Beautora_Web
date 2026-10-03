import type { SupabaseClient } from "@supabase/supabase-js";

export type AttendanceMethod = "MANUAL" | "DEVICE" | "APP" | "BIOMETRIC";
export type AttendanceAction = "check_in" | "check_out" | "toggle";

type AdminClient = SupabaseClient;

export async function resolveStaffForAttendance(
  admin: AdminClient,
  organizationId: string,
  credentials: { staffId?: string; pinCode?: string; thumbId?: string }
): Promise<
  | { staffId: string; staffName: string; method: AttendanceMethod }
  | { error: string; status: number }
> {
  const { staffId, pinCode, thumbId } = credentials;

  if (staffId) {
    const { data: staff } = await admin
      .from("staff")
      .select("id, full_name")
      .eq("organization_id", organizationId)
      .eq("id", staffId)
      .eq("is_active", true)
      .maybeSingle();
    if (!staff) return { error: "Staff not found", status: 404 };
    return { staffId: staff.id, staffName: staff.full_name, method: "DEVICE" };
  }

  if (thumbId) {
    const { data: staff } = await admin
      .from("staff")
      .select("id, full_name, thumb_id")
      .eq("organization_id", organizationId)
      .eq("thumb_id", thumbId)
      .eq("is_active", true)
      .maybeSingle();
    if (!staff) return { error: "Thumb not enrolled", status: 404 };
    return { staffId: staff.id, staffName: staff.full_name, method: "BIOMETRIC" };
  }

  if (pinCode) {
    const { data: staff } = await admin
      .from("staff")
      .select("id, full_name")
      .eq("organization_id", organizationId)
      .eq("pin_code", pinCode)
      .eq("is_active", true)
      .maybeSingle();
    if (!staff) return { error: "Invalid PIN", status: 404 };
    return { staffId: staff.id, staffName: staff.full_name, method: "DEVICE" };
  }

  return { error: "staffId, thumbId, or pinCode required", status: 400 };
}

export async function getOpenAttendanceSession(
  admin: AdminClient,
  organizationId: string,
  staffId: string
) {
  const { data } = await admin
    .from("staff_attendance")
    .select("id, check_in_at")
    .eq("staff_id", staffId)
    .eq("organization_id", organizationId)
    .is("check_out_at", null)
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

function resolveEventAt(at?: string | null): { iso: string } | { error: string; status: number } {
  if (!at?.trim()) return { iso: new Date().toISOString() };
  const parsed = new Date(at);
  if (Number.isNaN(parsed.getTime())) {
    return { error: "Invalid at timestamp", status: 400 };
  }
  const skewMs = Math.abs(Date.now() - parsed.getTime());
  // Allow device clocks up to 7 days behind (outage / delayed sync).
  if (skewMs > 7 * 24 * 60 * 60 * 1000) {
    return { error: "at timestamp is outside the allowed 7-day window", status: 400 };
  }
  if (parsed.getTime() > Date.now() + 5 * 60 * 1000) {
    return { error: "at timestamp cannot be more than 5 minutes in the future", status: 400 };
  }
  return { iso: parsed.toISOString() };
}

export async function recordAttendanceAction(
  admin: AdminClient,
  input: {
    organizationId: string;
    staffId: string;
    staffName: string;
    method: AttendanceMethod;
    deviceId?: string | null;
    action: AttendanceAction;
    /** Device punch time (ISO). Defaults to now. */
    at?: string | null;
    /** Optional idempotency key from device agent (userId@timestamp). */
    externalKey?: string | null;
  }
): Promise<
  | {
      ok: true;
      action: "check_in" | "check_out";
      staffId: string;
      staffName: string;
      method: AttendanceMethod;
      at: string;
      deduped?: boolean;
      /** Set on successful check-out (and on deduped check-out when known). */
      durationMinutes?: number;
    }
  | { error: string; status: number }
> {
  const open = await getOpenAttendanceSession(admin, input.organizationId, input.staffId);
  let resolvedAction = input.action;

  if (resolvedAction === "toggle") {
    resolvedAction = open ? "check_out" : "check_in";
  }

  const atResolved = resolveEventAt(input.at);
  if ("error" in atResolved) return atResolved;
  const at = atResolved.iso;
  const externalKey = input.externalKey?.trim() || null;
  const notes = externalKey ? `sdk:${externalKey}` : null;

  if (externalKey) {
    const { data: prior } = await admin
      .from("staff_attendance")
      .select("id, check_in_at, check_out_at")
      .eq("organization_id", input.organizationId)
      .eq("staff_id", input.staffId)
      .eq("notes", notes)
      .maybeSingle();
    if (prior) {
      return {
        ok: true,
        action: prior.check_out_at ? "check_out" : "check_in",
        staffId: input.staffId,
        staffName: input.staffName,
        method: input.method,
        at: prior.check_out_at ?? prior.check_in_at,
        deduped: true,
      };
    }
  }

  if (resolvedAction === "check_in") {
    if (open) {
      return { error: "Already checked in", status: 409 };
    }
    const { error } = await admin.from("staff_attendance").insert({
      organization_id: input.organizationId,
      staff_id: input.staffId,
      device_id: input.deviceId ?? null,
      method: input.method,
      check_in_at: at,
      notes,
    });
    if (error) return { error: error.message, status: 500 };
    return {
      ok: true,
      action: "check_in",
      staffId: input.staffId,
      staffName: input.staffName,
      method: input.method,
      at,
    };
  }

  if (!open) {
    return { error: "No open check-in", status: 400 };
  }

  const openIn = new Date(open.check_in_at).getTime();
  if (new Date(at).getTime() <= openIn) {
    return { error: "Check-out must be after the current check-in time", status: 400 };
  }

  const { error } = await admin
    .from("staff_attendance")
    .update({ check_out_at: at, ...(notes ? { notes } : {}) })
    .eq("id", open.id);
  if (error) return { error: error.message, status: 500 };

  const durationMinutes = Math.max(
    0,
    Math.round((new Date(at).getTime() - openIn) / 60000)
  );

  return {
    ok: true,
    action: "check_out",
    staffId: input.staffId,
    staffName: input.staffName,
    method: input.method,
    at,
    durationMinutes,
  };
}
