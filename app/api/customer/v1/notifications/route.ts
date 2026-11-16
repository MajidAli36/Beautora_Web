import { jsonCached, jsonError, resolveCustomerAppRequest } from "@/lib/customer-apps/api";
import { buildPublicNotifications } from "@/lib/customer-apps/notifications";

export const revalidate = 60;

/** GET ?app= — inbox: salon announcements + system rules / how-to text. */
export async function GET(request: Request) {
  const ctx = await resolveCustomerAppRequest(request);
  if ("error" in ctx) return jsonError(ctx.error, ctx.status);

  const notifications = await buildPublicNotifications({
    customerAppId: ctx.app.id,
    settings: ctx.settings,
  });

  return jsonCached({ notifications }, 30);
}
