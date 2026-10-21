import { jsonCached, jsonError, resolveCustomerAppRequest } from "@/lib/customer-apps/api";
import { listReelsForApp } from "@/lib/customer-apps/engagement";

export const revalidate = 60;

/** TikTok-style published reels for the customer app. */
export async function GET(request: Request) {
  const ctx = await resolveCustomerAppRequest(request);
  if ("error" in ctx) return jsonError(ctx.error, ctx.status);

  const reels = await listReelsForApp(ctx.app.id, { publishedOnly: true });
  return jsonCached({
    reels: reels.map((r) => ({
      id: r.id,
      title: r.title,
      caption: r.caption,
      videoUrl: r.video_url,
      posterUrl: r.poster_url,
      productId: r.product_id,
      serviceId: r.service_id,
      sortOrder: r.sort_order,
    })),
  });
}
