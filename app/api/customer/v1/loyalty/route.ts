import {
  jsonError,
  requireLookupPhone,
  resolveCustomerAppRequest,
} from "@/lib/customer-apps/api";
import {
  getLoyaltyBalance,
  getLoyaltyRules,
} from "@/lib/customer-apps/engagement";
import {
  getPointsHistory,
  listPointTypes,
} from "@/lib/customer-apps/domain";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET ?app=&phone= — rules, point types, balance, typed history. */
export async function GET(request: Request) {
  const ctx = await resolveCustomerAppRequest(request);
  if ("error" in ctx) return jsonError(ctx.error, ctx.status);

  const rules = await getLoyaltyRules(ctx.app.id);
  if (!rules.enabled || !rules.show_on_customer_app) {
    return jsonError("Loyalty is not enabled for this app", 403);
  }

  const phoneRaw = new URL(request.url).searchParams.get("phone")?.trim();
  let phone: string | undefined;
  if (phoneRaw) {
    const check = requireLookupPhone(phoneRaw);
    if ("error" in check) return jsonError(check.error, check.status);
    phone = check.phone;
  }

  const [pointTypes, balance, history] = await Promise.all([
    listPointTypes(ctx.app.id, true),
    phone
      ? getLoyaltyBalance(ctx.app.id, phone)
      : Promise.resolve({ balance: 0, recent: [] }),
    phone
      ? getPointsHistory({ customerAppId: ctx.app.id, phone, limit: 50 })
      : Promise.resolve([]),
  ]);

  const typeById = Object.fromEntries(pointTypes.map((t) => [t.id, t]));

  return NextResponse.json({
    rules: {
      pointsPerCompletedBooking: rules.points_per_completed_booking,
      pointsPerProductPurchase: rules.points_per_product_purchase,
      pointsPerCurrency: rules.points_per_currency,
      welcomeBonus: rules.welcome_bonus_points,
      minRedeemPoints: rules.min_redeem_points,
      redeemPointsPerCurrency: rules.redeem_points_per_currency,
      note: rules.rules_note,
    },
    pointTypes: pointTypes.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      description: t.description,
      icon: t.icon,
      color: t.color,
      earnHint: t.earn_hint,
    })),
    balance: balance.balance,
    recent: balance.recent,
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
