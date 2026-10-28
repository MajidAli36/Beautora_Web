/** Signup / account intent helpers — customer shoppers vs salon owners. */

export type SignupAccountType = "customer" | "owner";

/** What a salon owner configures during onboarding. */
export type ProductIntent = "marketplace" | "salon_pos" | "both";

export const PRODUCT_INTENT_OPTIONS: {
  id: ProductIntent;
  title: string;
  description: string;
}[] = [
  {
    id: "marketplace",
    title: "For Marketplace",
    description:
      "Sell products online with COD orders — Marketplace stock and money stay separate from salon POS.",
  },
  {
    id: "salon_pos",
    title: "For Salon POS",
    description:
      "Run bookings, salon POS checkout, staff, queue, inventory, and reports on the floor.",
  },
  {
    id: "both",
    title: "Both",
    description:
      "Salon Management & POS plus Marketplace in one Beautora workspace — switch anytime.",
  },
];

export function parseSignupAccountType(value: unknown): SignupAccountType | null {
  if (value === "customer" || value === "owner") return value;
  return null;
}

export function parseProductIntent(value: unknown): ProductIntent | null {
  if (value === "marketplace" || value === "salon_pos" || value === "both") return value;
  return null;
}

export function productIntentAllowsMode(
  intent: ProductIntent | null | undefined,
  mode: "saas" | "marketplace"
): boolean {
  if (!intent || intent === "both") return true;
  if (intent === "marketplace") return mode === "marketplace";
  return mode === "saas";
}

export function defaultAppModeForIntent(
  intent: ProductIntent | null | undefined
): "saas" | "marketplace" {
  return intent === "marketplace" ? "marketplace" : "saas";
}

export function landingPathForProductIntent(
  intent: ProductIntent | null | undefined
): "/dashboard" | "/marketplace" {
  return intent === "marketplace" ? "/marketplace" : "/dashboard";
}

export function isCustomerAccount(meta: Record<string, unknown> | null | undefined) {
  return meta?.account_type === "customer";
}

/**
 * Marketplace cart / checkout is for shopper accounts only.
 * Salon owners, staff, partners, and platform admins use different logins and must not
 * be treated as buyers just because they have an active session.
 */
export function marketplaceBuyerSession(user: {
  user_metadata?: Record<string, unknown> | null;
} | null): {
  isShopper: boolean;
  /** Signed in, but as salon / staff / partner — not a shopper */
  hasOtherAccountSession: boolean;
} {
  if (!user) return { isShopper: false, hasOtherAccountSession: false };
  if (isCustomerAccount(user.user_metadata)) {
    return { isShopper: true, hasOtherAccountSession: false };
  }
  return { isShopper: false, hasOtherAccountSession: true };
}

export function safeAuthRedirect(raw: string | null | undefined, fallback: string) {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (raw.startsWith("/login") || raw.startsWith("/signup")) return fallback;
  return raw;
}
