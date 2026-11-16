import { recordAttendanceAction } from "@/lib/attendance/record";
import { SYNCOPS_AGENT_API_KEY } from "@/lib/devices/syncops-agent";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";



/**
 * Loopback punch ingest from SyncOps Device Agent (realtime / ADMS).
 * Auth: X-Beautora-Agent-Key must match the local Device Agent API key.
 */
export async function POST(request: Request) {
  const key =
    request.headers.get("x-beautora-agent-key") ??
    request.headers.get("x-syncops-agent-key") ??
    "";
  if (key !== SYNCOPS_AGENT_API_KEY) {
    return NextResponse.json({ error: "Invalid agent key" }, { status: 401 });
  }

  let body: {
    thumbId?: string;
    action?: "toggle" | "check_in" | "check_out";
    at?: string;
    externalKey?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const thumbId = String(body.thumbId ?? "").trim();
  if (!thumbId) {
    return NextResponse.json({ error: "thumbId required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: matches, error: findError } = await admin
    .from("staff")
    .select("id, full_name, organization_id, thumb_id")
    .eq("thumb_id", thumbId)
    .eq("is_active", true)
    .limit(5);

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 });
  }
  if (!matches?.length) {
    return NextResponse.json(
      {
        error: `Thumb ID ${thumbId} not linked to any staff — set Machine User ID on /attendance`,
      },
      { status: 404 }
    );
  }
  if (matches.length > 1) {
    return NextResponse.json(
      { error: `Thumb ID ${thumbId} is linked to multiple staff` },
      { status: 409 }
    );
  }

  const staff = matches[0];
  const action = body.action === "check_in" || body.action === "check_out" ? body.action : "toggle";
  const externalKey =
    body.externalKey?.trim() ||
    `${thumbId}@${body.at ? new Date(body.at).getTime() : Date.now()}`;

  const result = await recordAttendanceAction(admin, {
    organizationId: staff.organization_id,
    staffId: staff.id,
    staffName: staff.full_name,
    method: "BIOMETRIC",
    action,
    at: body.at,
    externalKey,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  revalidatePath("/attendance");
  return NextResponse.json({
    ok: true,
    success: true,
    action: result.action,
    staffId: result.staffId,
    staffName: result.staffName,
    at: result.at,
    durationMinutes: result.durationMinutes,
    deduped: result.deduped ?? false,
  });
}
