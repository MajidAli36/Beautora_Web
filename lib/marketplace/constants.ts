/** Marketplace constants — isolated from salon SaaS billing/finances. */

/** Fallback when marketplace_settings row is missing (free launch = 0%). */
export const MARKETPLACE_COMMISSION_RATE = 0;

export const APP_MODE_COOKIE = "beautora_app_mode";
export type AppMode = "saas" | "marketplace";

export const MARKETPLACE_ORDER_STATUSES = [
  "placed",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type MarketplaceOrderStatus = (typeof MARKETPLACE_ORDER_STATUSES)[number];

export const SELLER_ORDER_STATUSES = [
  "placed",
  "confirmed",
  "processing",
  "ready",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type SellerOrderStatus = (typeof SELLER_ORDER_STATUSES)[number];

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "shop";
}

export function formatCommissionPercent(rate: number): string {
  const pct = Math.round(rate * 10000) / 100;
  return Number.isInteger(pct) ? `${pct}` : pct.toFixed(2).replace(/\.?0+$/, "");
}
