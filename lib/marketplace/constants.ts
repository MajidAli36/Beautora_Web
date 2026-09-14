/** Marketplace constants — isolated from salon SaaS billing/finances. */

export const MARKETPLACE_COMMISSION_RATE = 0.1;

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

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "shop";
}
