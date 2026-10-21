import { jsonCached, jsonError, resolveCustomerAppRequest } from "@/lib/customer-apps/api";
import { listAppDeals } from "@/lib/customer-apps/domain";

export const revalidate = 60;

/** GET — published customer-app deals only. */
export async function GET(request: Request) {
  const ctx = await resolveCustomerAppRequest(request);
  if ("error" in ctx) return jsonError(ctx.error, ctx.status);

  const deals = await listAppDeals(ctx.app.id, true);
  const now = Date.now();
  const active = deals.filter((d) => {
    if (d.starts_at && new Date(d.starts_at).getTime() > now) return false;
    if (d.ends_at && new Date(d.ends_at).getTime() < now) return false;
    return true;
  });

  return jsonCached({
    deals: active.map((d) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      discountPercent: d.discount_percent,
      discountAmount: d.discount_amount,
      imageUrl: d.image_url,
      startsAt: d.starts_at,
      endsAt: d.ends_at,
      appProductId: d.app_product_id,
      serviceId: d.service_id,
    })),
  });
}
