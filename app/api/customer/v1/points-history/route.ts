import {
  jsonError,
  requireLookupPhone,
  resolveCustomerAppRequest,
} from "@/lib/customer-apps/api";
import { getPointsHistory, listPointTypes } from "@/lib/customer-apps/domain";
import { getLoyaltyRules } from "@/lib/customer-apps/engagement";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET ?app=&phone= — full typed points ledger for an app customer phone. */
export async function GET(request: Request) {
  const ctx = await resolveCustomerAppRequest(request);
  if ("error" in ctx) return jsonError(ctx.error, ctx.status);

  const rules = await getLoyaltyRules(ctx.app.id);
  if (!rules.enabled || !rules.show_on_customer_app) {
    return jsonError("Loyalty is not enabled for this app", 403);
  }

  const phoneCheck = requireLookupPhone(
    new URL(request.url).searchParams.get("phone")
  );
  if ("error" in phoneCheck) return jsonError(phoneCheck.error, phoneCheck.status);
  const phone = phoneCheck.phone;

  const [pointTypes, history] = await Promise.all([
    listPointTypes(ctx.app.id, true),
    getPointsHistory({ customerAppId: ctx.app.id, phone, limit: 100 }),
  ]);
  const typeById = Object.fromEntries(pointTypes.map((t) => [t.id, t]));

  return NextResponse.json({
    phone,
    pointTypes: pointTypes.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      color: t.color,
      earnHint: t.earn_hint,
    })),
    history: history.map((h) => ({
      id: h.id,
      deltaPoints: h.delta_points,
      balanceAfter: h.balance_after,
      reason: h.reason,
      pointTypeId: h.point_type_id,
      pointTypeName: h.point_type_id
        ? typeById[h.point_type_id as string]?.name ?? null
        : null,
      createdAt: h.created_at,
    })),
  });
}
