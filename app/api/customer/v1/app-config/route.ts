import { jsonCached, jsonError, resolveCustomerAppRequest } from "@/lib/customer-apps/api";

export const revalidate = 60;

/** GET /api/customer/v1/app-config?app=<slug> — published config only. */
export async function GET(request: Request) {
  const ctx = await resolveCustomerAppRequest(request);
  if ("error" in ctx) return jsonError(ctx.error, ctx.status);
  return jsonCached({
    slug: ctx.app.slug,
    status: ctx.app.status,
    displayName: ctx.app.display_name,
    settings: ctx.settings,
    organizationIds: ctx.organizationIds,
  });
}
