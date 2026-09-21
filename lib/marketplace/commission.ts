import { createAdminClient } from "@/lib/supabase/admin";
import { MARKETPLACE_COMMISSION_RATE } from "@/lib/marketplace/constants";

export type ResolvedCommission = {
  rate: number;
  ruleScope: "global" | "category" | "seller" | "product" | "settings";
};

/** Default commission from marketplace_settings (free launch = 0). */
export async function getDefaultCommissionRate(): Promise<number> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("marketplace_settings")
      .select("default_commission_rate")
      .eq("id", 1)
      .maybeSingle();
    if (data?.default_commission_rate != null) {
      return Number(data.default_commission_rate);
    }
  } catch {
    // Table may not exist until Phase 2 migration is applied.
  }
  return MARKETPLACE_COMMISSION_RATE;
}

/**
 * Resolve commission for a line: product > seller > category > settings.
 * Falls back to settings / constant if RPC or rules are unavailable.
 */
export async function resolveCommissionRate(input: {
  productId?: string | null;
  sellerId: string;
  categoryId?: string | null;
}): Promise<ResolvedCommission> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("marketplace_resolve_commission_rate", {
      p_product_id: input.productId ?? null,
      p_seller_id: input.sellerId,
      p_category_id: input.categoryId ?? null,
    });
    if (!error && data != null) {
      return { rate: Number(data), ruleScope: "settings" };
    }
  } catch {
    // RPC missing until migration applied.
  }

  const rate = await getDefaultCommissionRate();
  return { rate, ruleScope: "settings" };
}
