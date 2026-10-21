import {
  jsonCached,
  jsonError,
  listScopedSalons,
  resolveCustomerAppRequest,
} from "@/lib/customer-apps/api";

export const revalidate = 60;

export async function GET(request: Request) {
  const ctx = await resolveCustomerAppRequest(request);
  if ("error" in ctx) return jsonError(ctx.error, ctx.status);
  const salons = await listScopedSalons(ctx.organizationIds);
  return jsonCached({ salons });
}
