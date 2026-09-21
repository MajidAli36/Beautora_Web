"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveCommissionRate } from "@/lib/marketplace/commission";

export async function ensureCommissionsForSellerOrder(input: {
  orderId: string;
  sellerId: string;
  sellerOrderId: string;
  grossAmount: number;
}): Promise<{ commissionAmount: number; commissionId: string | null }> {
  const admin = createAdminClient();

  const { data: items } = await admin
    .from("marketplace_order_items")
    .select("product_id, line_total")
    .eq("order_id", input.orderId)
    .eq("seller_id", input.sellerId);

  const productIds = [
    ...new Set((items ?? []).map((i) => i.product_id).filter(Boolean)),
  ] as string[];
  const categoryByProduct = new Map<string, string | null>();
  if (productIds.length) {
    const { data: products } = await admin
      .from("marketplace_products")
      .select("id, category_id")
      .in("id", productIds);
    for (const p of products ?? []) categoryByProduct.set(p.id, p.category_id);
  }

  let weightedRate = 0;
  let gross = 0;
  let ruleScope: string = "settings";
  for (const i of items ?? []) {
    const { rate, ruleScope: scope } = await resolveCommissionRate({
      productId: i.product_id,
      sellerId: input.sellerId,
      categoryId: i.product_id ? categoryByProduct.get(i.product_id) ?? null : null,
    });
    const line = Number(i.line_total);
    weightedRate =
      gross + line > 0 ? (weightedRate * gross + rate * line) / (gross + line) : rate;
    gross += line;
    ruleScope = scope;
  }

  if (gross <= 0) gross = input.grossAmount;
  const commissionAmount = Math.round(gross * weightedRate * 100) / 100;

  const { data, error } = await admin
    .from("marketplace_commissions")
    .upsert(
      {
        order_id: input.orderId,
        seller_id: input.sellerId,
        gross_amount: gross,
        rate: weightedRate,
        commission_amount: commissionAmount,
        payout_status: "owed",
        rule_scope: ruleScope,
      },
      { onConflict: "order_id,seller_id" }
    )
    .select("id")
    .maybeSingle();

  if (error) {
    return { commissionAmount, commissionId: null };
  }
  return { commissionAmount, commissionId: data?.id ?? null };
}
