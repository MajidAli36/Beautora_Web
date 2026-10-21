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

/**
 * Seller pricing / profitability analytics from real catalog + order-item snapshots.
 * Gross profit uses charged unit_price − unit_cost (not current product prices).
 * Cancelled order lines are excluded. Commission is reported separately (not net profit).
 */
export async function getSellerPricingAnalytics(sellerId: string, days = 30) {
  const {
    applyCommissionToInventoryKpis,
    calculateMarketplacePricing,
    lineItemGrossProfit,
    roundMoney,
    sellerNetAfterCommission,
    summarizeMarketplaceInventory,
  } = await import("@/lib/marketplace/pricing");
  const { getDefaultCommissionRate } = await import("@/lib/marketplace/commission");
  const commissionRate = await getDefaultCommissionRate();

  const admin = tryCreateAdminClient();
  const supabase = admin ?? (await createClient());

  const { data: products } = await supabase
    .from("marketplace_products")
    .select("id, title, price, sale_price, cost_price, stock, status, low_stock_threshold")
    .eq("seller_id", sellerId);

  const catalog = products ?? [];
  const inventory = applyCommissionToInventoryKpis(
    summarizeMarketplaceInventory(catalog),
    commissionRate
  );

  const highestMarginProducts = catalog
    .map((p) => {
      const c = calculateMarketplacePricing({
        costPrice: p.cost_price,
        sellingPrice: Number(p.price) || 0,
        discountPrice: p.sale_price,
      });
      return {
        id: p.id,
        title: p.title,
        marginPct: c.profitMarginPercentage,
        profitPerUnit: c.profitPerUnit,
      };
    })
    .filter((p) => p.profitPerUnit > 0)
    .sort((a, b) => b.marginPct - a.marginPct)
    .slice(0, 8);

  const onDiscount = catalog
    .map((p) => {
      const c = calculateMarketplacePricing({
        costPrice: p.cost_price,
        sellingPrice: Number(p.price) || 0,
        discountPrice: p.sale_price,
      });
      return c.hasDiscount
        ? { id: p.id, title: p.title, discountPct: c.discountPercentage }
        : null;
    })
    .filter(Boolean)
    .slice(0, 8) as Array<{ id: string; title: string; discountPct: number }>;

  const lowStock = catalog
    .filter((p) => {
      const stock = Number(p.stock) || 0;
      const threshold = Number(p.low_stock_threshold) || 3;
      return stock <= threshold;
    })
    .map((p) => ({
      id: p.id,
      title: p.title,
      stock: Number(p.stock) || 0,
      threshold: Number(p.low_stock_threshold) || 3,
    }))
    .slice(0, 8);

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: items } = await supabase
    .from("marketplace_order_items")
    .select(
      "product_id, product_title, unit_price, unit_cost, quantity, line_total, fulfillment_status, created_at, order_id"
    )
    .eq("seller_id", sellerId)
    .gte("created_at", since.toISOString());

  // Exclude lines on cancelled parent orders when status is available.
  const orderIds = [...new Set((items ?? []).map((i) => i.order_id).filter(Boolean))];
  const cancelledOrders = new Set<string>();
  if (orderIds.length) {
    const { data: orders } = await supabase
      .from("marketplace_orders")
      .select("id, status")
      .in("id", orderIds);
    for (const o of orders ?? []) {
      if (o.status === "cancelled") cancelledOrders.add(o.id);
    }
  }

  let realizedRevenue = 0;
  let realizedCogs = 0;
  let realizedGrossProfit = 0;
  let withCost = 0;
  let totalLines = 0;
  const byProduct = new Map<
    string,
    { productId: string | null; title: string; revenue: number; grossProfit: number; quantity: number }
  >();

  for (const raw of items ?? []) {
    if (cancelledOrders.has(raw.order_id)) continue;
    if (raw.fulfillment_status === "cancelled") continue;
    totalLines += 1;
    const unitCost = raw.unit_cost != null ? Number(raw.unit_cost) : null;
    if (unitCost != null) withCost += 1;
    const qty = Number(raw.quantity) || 0;
    const revenue = roundMoney(Number(raw.line_total) || 0);
    const cogs = roundMoney((unitCost ?? 0) * qty);
    const gp = lineItemGrossProfit({
      unit_price: Number(raw.unit_price),
      unit_cost: unitCost ?? 0,
      quantity: qty,
      fulfillment_status: raw.fulfillment_status,
    });
    realizedRevenue += revenue;
    realizedCogs += cogs;
    realizedGrossProfit += gp;
    const key = raw.product_id ?? raw.product_title;
    const cur = byProduct.get(key) ?? {
      productId: raw.product_id,
      title: raw.product_title,
      revenue: 0,
      grossProfit: 0,
      quantity: 0,
    };
    cur.revenue = roundMoney(cur.revenue + revenue);
    cur.grossProfit = roundMoney(cur.grossProfit + gp);
    cur.quantity += qty;
    byProduct.set(key, cur);
  }

  const topByProfit = [...byProduct.values()]
    .sort((a, b) => b.grossProfit - a.grossProfit)
    .slice(0, 8);

  const realized = {
    realizedRevenue: roundMoney(realizedRevenue),
    realizedCogs: roundMoney(realizedCogs),
    realizedGrossProfit: roundMoney(realizedGrossProfit),
  };
  // Fee is on revenue. At 0% rate, sellerNet* equals gross figures (all money to seller).
  const afterFee = sellerNetAfterCommission({
    revenue: realized.realizedRevenue,
    grossProfit: realized.realizedGrossProfit,
    commissionRate,
  });

  return {
    inventory,
    ...realized,
    commissionRate,
    estimatedPlatformCommission: afterFee.commissionAmount,
    sellerNetProceeds: afterFee.sellerNetProceeds,
    sellerNetProfit: afterFee.sellerNetProfit,
    topByProfit,
    highestMarginProducts,
    onDiscount,
    lowStock,
    costSnapshotCoverage: {
      withCost,
      total: totalLines,
      missingHistoricalNote: totalLines > 0 && withCost < totalLines,
    },
  };
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
