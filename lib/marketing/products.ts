import type { AppMode } from "@/lib/marketplace/constants";

/**
 * Beautora dual-product surface — Salon Management (POS & ops) + Marketplace (commerce).
 * Keep copy isolated from salon store BRAND (Hair & Care demo salon).
 */
export const BEAUTORA_PRODUCTS = {
  saas: {
    id: "saas" as const satisfies AppMode,
    name: "Salon POS",
    shortLabel: "Salon POS",
    eyebrow: "POS & operations",
    tagline: "Booking, POS & the floor",
    description:
      "Online booking, POS checkout, queue, staff, inventory, CRM, and reports — everything to run the salon day.",
    switchHint: "Switch to Salon POS: booking, POS, stock & team.",
  },
  marketplace: {
    id: "marketplace" as const satisfies AppMode,
    name: "Marketplace",
    shortLabel: "Marketplace",
    eyebrow: "Online commerce",
    tagline: "Sell products online",
    description:
      "List products, take COD orders, manage marketplace stock & payouts — separate from salon POS inventory and finances.",
    switchHint: "Switch to Marketplace: products, orders & commissions.",
  },
  customer_app: {
    id: "customer_app" as const satisfies AppMode,
    name: "App dashboard",
    shortLabel: "App dashboard",
    eyebrow: "Customer app",
    tagline: "Branding, points & reels",
    description:
      "Manage your branded customer app — branding, loyalty points, leaderboard, products in app, and TikTok-style reels.",
    switchHint: "Switch to App dashboard: customer app settings.",
  },
} as const;

export const BEAUTORA_PRODUCT_PAIR = {
  title: "Salon Management & Marketplace",
  /** Short SEO / hero line */
  seoPhrase: "AI-Powered Salon Management, POS & Marketplace",
  subtitle: "POS for the floor. Marketplace for online retail. One Beautora workspace.",
  description:
    "Beautora combines Salon Management (booking, POS, staff, inventory, reports) with a separate Marketplace so salons and sellers can sell products online — without mixing shop money into salon finances.",
  keywords: [
    "salon management software",
    "salon POS",
    "salon marketplace",
    "beauty salon POS software",
    "online salon booking",
    "salon product marketplace",
    "beauty retail marketplace",
    "AI-powered salon management",
  ],
} as const;

export function productForMode(mode: AppMode) {
  if (mode === "marketplace") return BEAUTORA_PRODUCTS.marketplace;
  if (mode === "customer_app") return BEAUTORA_PRODUCTS.customer_app;
  return BEAUTORA_PRODUCTS.saas;
}
