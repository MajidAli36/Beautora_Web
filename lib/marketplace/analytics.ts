"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types/commerce";
import type { Json } from "@/types/database.types";

export async function trackMarketplaceEvent(input: {
  eventType: string;
  sellerId?: string | null;
  productId?: string | null;
  organizationId?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin) return;

  let userId: string | null = null;
  try {
    const user = await requireAuth();
    userId = user.id;
  } catch {
    // anonymous ok
  }

  await admin.from("marketplace_analytics_events").insert({
    event_type: input.eventType,
    user_id: userId,
    seller_id: input.sellerId ?? null,
    product_id: input.productId ?? null,
    organization_id: input.organizationId ?? null,
    meta: (input.meta ?? null) as Json | null,
  });
}

export async function getSellerAnalyticsSummary(sellerId: string, days = 30) {
  const admin = tryCreateAdminClient();
  if (!admin) return { views: 0, addToCart: 0, purchases: 0 };
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await admin
    .from("marketplace_analytics_events")
    .select("event_type")
    .eq("seller_id", sellerId)
    .gte("created_at", since.toISOString());

  let views = 0;
  let addToCart = 0;
  let purchases = 0;
  for (const e of data ?? []) {
    if (e.event_type === "product_view" || e.event_type === "store_view") views += 1;
    else if (e.event_type === "add_to_cart") addToCart += 1;
    else if (e.event_type === "purchase") purchases += 1;
  }
  return { views, addToCart, purchases };
}

export async function requestSellerPayout(formData: FormData): Promise<ActionResult> {
  const { getMyMarketplaceSeller } = await import("@/lib/marketplace/actions");
  const seller = await getMyMarketplaceSeller();
  if (!seller) return { error: "Not a seller." };
  if (seller.status !== "approved") return { error: "Seller must be approved." };

  const amount = Number(formData.get("amount") ?? 0);
  const method = String(formData.get("method") ?? "manual").trim() || "manual";
  const details = String(formData.get("payout_details") ?? "").trim() || null;

  if (!(amount > 0)) return { error: "Enter a valid amount." };
  if (!["manual", "bank", "wallet", "provider"].includes(method)) {
    return { error: "Invalid payout method." };
  }

  const { getSellerLedgerBalance } = await import("@/lib/marketplace/ledger");
  const balance = await getSellerLedgerBalance(seller.id);
  if (amount > balance.available + 0.001) {
    return { error: `Available balance is ${balance.available.toFixed(2)}.` };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("marketplace_payout_requests").insert({
    seller_id: seller.id,
    amount,
    method: method as "manual" | "bank" | "wallet" | "provider",
    payout_details: details,
    status: "pending",
  });
  if (error) return { error: error.message };

  revalidatePath("/marketplace/payouts");
  return { success: true, message: "Payout request submitted." };
}

export async function listMyPayoutRequests() {
  const { getMyMarketplaceSeller } = await import("@/lib/marketplace/actions");
  const seller = await getMyMarketplaceSeller();
  if (!seller) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("marketplace_payout_requests")
    .select("*")
    .eq("seller_id", seller.id)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}
