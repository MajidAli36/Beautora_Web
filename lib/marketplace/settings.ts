"use server";

import { createAdminClient, tryCreateAdminClient } from "@/lib/supabase/admin";
import { MARKETPLACE_COMMISSION_RATE } from "@/lib/marketplace/constants";
import type { Database } from "@/types/database.types";

export type MarketplaceSettings =
  Database["public"]["Tables"]["marketplace_settings"]["Row"];

const FALLBACK: MarketplaceSettings = {
  id: 1,
  listing_fee: 0,
  default_commission_rate: MARKETPLACE_COMMISSION_RATE,
  featured_listing_price: 0,
  advertising_price: 0,
  online_payments_enabled: false,
  marketplace_enabled: true,
  updated_at: new Date(0).toISOString(),
  updated_by: null,
};

export async function getMarketplaceSettings(): Promise<MarketplaceSettings> {
  const admin = tryCreateAdminClient();
  if (!admin) return FALLBACK;
  try {
    const { data } = await admin
      .from("marketplace_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    return (data as MarketplaceSettings | null) ?? FALLBACK;
  } catch {
    return FALLBACK;
  }
}

export async function isMarketplaceEnabled(): Promise<boolean> {
  const s = await getMarketplaceSettings();
  return s.marketplace_enabled;
}
