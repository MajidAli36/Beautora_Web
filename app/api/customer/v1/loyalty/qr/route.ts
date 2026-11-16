import {
  jsonError,
  requireLookupPhone,
  resolveCustomerAppRequest,
} from "@/lib/customer-apps/api";
import { getLoyaltyBalance, getLoyaltyRules } from "@/lib/customer-apps/engagement";
import { issueLoyaltyQrToken } from "@/lib/customer-apps/loyalty-qr";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET ?app=&phone= — issue a short-lived QR payload for the member's virtual card.
 * Salon staff scans it, then POSTs /loyalty/redeem with points to deduct.
 */
export async function GET(request: Request) {
  const ctx = await resolveCustomerAppRequest(request);
  if ("error" in ctx) return jsonError(ctx.error, ctx.status);

  const rules = await getLoyaltyRules(ctx.app.id);
  if (!rules.enabled || !rules.show_on_customer_app) {
    return jsonError("Loyalty is not enabled for this app", 403);
  }

  const phoneRaw = new URL(request.url).searchParams.get("phone");
  const check = requireLookupPhone(phoneRaw);
  if ("error" in check) return jsonError(check.error, check.status);

  const balance = await getLoyaltyBalance(ctx.app.id, check.phone);
  const orgId = ctx.organizationIds[0];
  if (!orgId) return jsonError("Customer app has no linked salon", 400);

  const issued = issueLoyaltyQrToken({
    customerAppId: ctx.app.id,
    organizationId: orgId,
    phone: check.phone,
    balance: balance.balance,
  });

  return NextResponse.json({
    code: issued.code,
    qrPayload: issued.token,
    balance: balance.balance,
    expiresAt: issued.expiresAt,
    minRedeemPoints: rules.min_redeem_points,
    redeemPointsPerCurrency: rules.redeem_points_per_currency,
  });
}
