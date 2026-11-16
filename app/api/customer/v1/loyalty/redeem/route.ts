import {
  jsonError,
  resolveCustomerAppRequest,
} from "@/lib/customer-apps/api";
import { redeemLoyaltyQr } from "@/lib/customer-apps/loyalty-qr";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST { token, points, reason? }
 * Deducts points for a scanned virtual-card QR. Intended for salon POS / desk.
 */
export async function POST(request: Request) {
  const ctx = await resolveCustomerAppRequest(request);
  if ("error" in ctx) return jsonError(ctx.error, ctx.status);

  let body: { token?: string; points?: number; reason?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const token = String(body.token ?? "").trim();
  if (!token) return jsonError("token is required", 400);

  try {
    const result = await redeemLoyaltyQr({
      customerAppId: ctx.app.id,
      organizationIds: ctx.organizationIds,
      token,
      points: Number(body.points),
      reason: body.reason,
    });
    return NextResponse.json({
      ok: true,
      balance: result.balance,
      redeemed: result.redeemed,
    });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Redeem failed", 400);
  }
}
