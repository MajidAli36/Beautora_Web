"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureCommissionsForSellerOrder } from "@/lib/marketplace/fulfillment-commission";
import { recordDeliveryLedger } from "@/lib/marketplace/ledger";
import {
  SELLER_ORDER_STATUSES,
  type SellerOrderStatus,
} from "@/lib/marketplace/constants";
import type { ActionResult } from "@/types/commerce";

async function requireSeller() {
  const { getMyMarketplaceSeller } = await import("@/lib/marketplace/actions");
  return getMyMarketplaceSeller();
}

export async function listMySellerOrders() {
  const seller = await requireSeller();
  if (!seller) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("marketplace_seller_orders")
    .select("*, marketplace_orders(*), marketplace_order_items(*)")
    .eq("seller_id", seller.id)
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function updateSellerSubOrderStatus(
  sellerOrderId: string,
  status: SellerOrderStatus
): Promise<ActionResult> {
  const seller = await requireSeller();
  if (!seller) return { error: "Not a seller." };
  if (!SELLER_ORDER_STATUSES.includes(status)) return { error: "Invalid status." };

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("marketplace_seller_orders")
    .select("*")
    .eq("id", sellerOrderId)
    .eq("seller_id", seller.id)
    .maybeSingle();
  if (!sub) return { error: "Order not found." };
  if (sub.status === status) return { success: true };

  const { error } = await admin
    .from("marketplace_seller_orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", sellerOrderId)
    .eq("seller_id", seller.id);
  if (error) return { error: error.message };

  await admin
    .from("marketplace_order_items")
    .update({ fulfillment_status: status })
    .eq("seller_order_id", sellerOrderId);

  // Roll up parent order status when all seller orders agree
  await maybeRollupParentOrderStatus(sub.order_id);

  if (status === "delivered" && sub.status !== "delivered") {
    const commission = await ensureCommissionsForSellerOrder({
      orderId: sub.order_id,
      sellerId: seller.id,
      sellerOrderId: sub.id,
      grossAmount: Number(sub.subtotal),
    });
    const { data: parentOrder } = await admin
      .from("marketplace_orders")
      .select("currency")
      .eq("id", sub.order_id)
      .maybeSingle();
    await recordDeliveryLedger({
      sellerId: seller.id,
      orderId: sub.order_id,
      sellerOrderId: sub.id,
      grossAmount: Number(sub.subtotal),
      commissionAmount: commission.commissionAmount,
      commissionId: commission.commissionId,
      currency: parentOrder?.currency ?? "PKR",
    });
  }

  revalidatePath("/marketplace/orders");
  revalidatePath("/marketplace/payouts");
  return { success: true };
}

async function maybeRollupParentOrderStatus(orderId: string) {
  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("marketplace_seller_orders")
    .select("status")
    .eq("order_id", orderId);
  if (!subs?.length) return;

  const statuses = new Set(subs.map((s) => s.status));
  let parent: string | null = null;
  if (statuses.size === 1) {
    const only = [...statuses][0];
    if (["placed", "confirmed", "shipped", "delivered", "cancelled"].includes(only)) {
      parent = only;
    } else if (only === "processing" || only === "ready") {
      parent = "confirmed";
    }
  } else if ([...statuses].every((s) => s === "delivered" || s === "cancelled")) {
    parent = statuses.has("delivered") ? "delivered" : "cancelled";
  } else if ([...statuses].some((s) => s === "shipped" || s === "delivered")) {
    parent = "shipped";
  } else if ([...statuses].some((s) => s === "confirmed" || s === "processing" || s === "ready")) {
    parent = "confirmed";
  }

  if (parent) {
    await admin
      .from("marketplace_orders")
      .update({
        status: parent as
          | "placed"
          | "confirmed"
          | "shipped"
          | "delivered"
          | "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
  }
}
