"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdminEmail } from "@/lib/billing/subscription";
import type { ActionResult } from "@/types/commerce";

async function requirePlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isPlatformAdminEmail(user.email)) {
    throw new Error("Platform admin only");
  }
  return user;
}

export async function updateMarketplaceSettingsAction(
  formData: FormData
): Promise<ActionResult> {
  await requirePlatformAdmin();
  const listingFee = Number(formData.get("listing_fee") ?? 0);
  const commissionPct = Number(formData.get("default_commission_pct") ?? 0);
  const featured = Number(formData.get("featured_listing_price") ?? 0);
  const advertising = Number(formData.get("advertising_price") ?? 0);
  const onlinePayments = String(formData.get("online_payments_enabled") ?? "") === "1";
  const enabled = String(formData.get("marketplace_enabled") ?? "") === "1";

  if (!(listingFee >= 0) || !(featured >= 0) || !(advertising >= 0)) {
    return { error: "Invalid fee amounts." };
  }
  if (!(commissionPct >= 0) || commissionPct > 100) {
    return { error: "Commission must be 0–100%." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("marketplace_settings").upsert({
    id: 1,
    listing_fee: listingFee,
    default_commission_rate: commissionPct / 100,
    featured_listing_price: featured,
    advertising_price: advertising,
    online_payments_enabled: onlinePayments,
    marketplace_enabled: enabled,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };

  revalidatePath("/platform");
  revalidatePath("/platform/marketplace");
  revalidatePath("/marketplace");
  return { success: true, message: "Marketplace settings saved." };
}

export async function upsertCommissionRuleAction(
  formData: FormData
): Promise<ActionResult> {
  await requirePlatformAdmin();
  const scope = String(formData.get("scope") ?? "global") as
    | "global"
    | "category"
    | "seller"
    | "product";
  const ratePct = Number(formData.get("rate_pct") ?? 0);
  const categoryId = String(formData.get("category_id") ?? "").trim() || null;
  const sellerId = String(formData.get("seller_id") ?? "").trim() || null;
  const productId = String(formData.get("product_id") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!(ratePct >= 0) || ratePct > 100) return { error: "Rate must be 0–100%." };

  const admin = createAdminClient();
  // Deactivate existing active rule for same scope key
  if (scope === "global") {
    await admin
      .from("marketplace_commission_rules")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("scope", "global")
      .eq("is_active", true);
  } else if (scope === "seller" && sellerId) {
    await admin
      .from("marketplace_commission_rules")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("scope", "seller")
      .eq("seller_id", sellerId)
      .eq("is_active", true);
  } else if (scope === "category" && categoryId) {
    await admin
      .from("marketplace_commission_rules")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("scope", "category")
      .eq("category_id", categoryId)
      .eq("is_active", true);
  } else if (scope === "product" && productId) {
    await admin
      .from("marketplace_commission_rules")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("scope", "product")
      .eq("product_id", productId)
      .eq("is_active", true);
  }

  const { error } = await admin.from("marketplace_commission_rules").insert({
    scope,
    rate: ratePct / 100,
    category_id: scope === "category" ? categoryId : null,
    seller_id: scope === "seller" ? sellerId : null,
    product_id: scope === "product" ? productId : null,
    notes,
    is_active: true,
  });
  if (error) return { error: error.message };
  revalidatePath("/platform/marketplace");
  return { success: true };
}

export async function listPlatformPayoutRequests() {
  await requirePlatformAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from("marketplace_payout_requests")
    .select("*, marketplace_sellers(shop_name, slug)")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function reviewPayoutRequestAction(
  requestId: string,
  status: "approved" | "rejected" | "held" | "completed",
  reviewNotes?: string
): Promise<ActionResult> {
  const adminUser = await requirePlatformAdmin();
  const admin = createAdminClient();
  const { data: req } = await admin
    .from("marketplace_payout_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) return { error: "Request not found." };

  const { error } = await admin
    .from("marketplace_payout_requests")
    .update({
      status,
      review_notes: reviewNotes?.trim() || null,
      reviewed_by: adminUser.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);
  if (error) return { error: error.message };

  if (status === "completed") {
    const { appendSellerLedger } = await import("@/lib/marketplace/ledger");
    await appendSellerLedger({
      seller_id: req.seller_id,
      entry_type: "PAYOUT",
      amount: Number(req.amount),
      currency: req.currency,
      idempotency_key: `payout_request:${requestId}`,
      notes: "Payout request completed",
      created_by: adminUser.id,
    });
  }

  revalidatePath("/platform/marketplace");
  return { success: true };
}

export async function getPlatformMarketplaceMetrics() {
  await requirePlatformAdmin();
  const admin = createAdminClient();
  const [sellers, products, orders, commissions, owed] = await Promise.all([
    admin.from("marketplace_sellers").select("id", { count: "exact", head: true }),
    admin
      .from("marketplace_products")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    admin.from("marketplace_orders").select("id", { count: "exact", head: true }),
    admin
      .from("marketplace_commissions")
      .select("commission_amount, payout_status"),
    admin
      .from("marketplace_payout_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  let commissionOwed = 0;
  let commissionPaid = 0;
  for (const c of commissions.data ?? []) {
    const amt = Number(c.commission_amount);
    if (c.payout_status === "owed") commissionOwed += amt;
    else commissionPaid += amt;
  }

  return {
    sellers: sellers.count ?? 0,
    publishedProducts: products.count ?? 0,
    orders: orders.count ?? 0,
    commissionOwed,
    commissionPaid,
    pendingPayoutRequests: owed.count ?? 0,
  };
}
