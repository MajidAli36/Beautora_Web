import {
  jsonCached,
  jsonError,
  listScopedStaff,
  resolveCustomerAppRequest,
} from "@/lib/customer-apps/api";

export const revalidate = 60;

/**
 * GET ?app=&organizationId= — online-bookable staff for assigned salons.
 */
export async function GET(request: Request) {
  const ctx = await resolveCustomerAppRequest(request);
  if ("error" in ctx) return jsonError(ctx.error, ctx.status);
  if (!ctx.settings.features.online_appointments) {
    return jsonError("Online appointments feature is disabled", 403);
  }

  const orgId = new URL(request.url).searchParams.get("organizationId")?.trim();
  const orgIds = orgId
    ? ctx.organizationIds.includes(orgId)
      ? [orgId]
      : []
    : ctx.organizationIds;

  if (orgId && !orgIds.length) {
    return jsonError("Salon not assigned to this app", 403);
  }

  const staff = await listScopedStaff(orgIds);
  return jsonCached({
    staff: staff.map((s) => ({
      id: s.id,
      organizationId: s.organization_id,
      fullName: s.full_name,
      jobTitle: s.job_title,
    })),
  });
}
