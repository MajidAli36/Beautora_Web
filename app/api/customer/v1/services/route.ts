import {
  jsonCached,
  jsonError,
  listScopedServices,
  resolveCustomerAppRequest,
} from "@/lib/customer-apps/api";

export const revalidate = 60;

export async function GET(request: Request) {
  const ctx = await resolveCustomerAppRequest(request);
  if ("error" in ctx) return jsonError(ctx.error, ctx.status);
  if (!ctx.settings.features.online_appointments) {
    return jsonError("Online appointments feature is disabled", 403);
  }
  const services = await listScopedServices(ctx.organizationIds);
  return jsonCached({ services });
}
