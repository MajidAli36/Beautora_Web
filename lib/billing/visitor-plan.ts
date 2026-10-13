import {
  resolveBillingPlanFromCountryCode,
  type BillingPlan,
} from "@/lib/billing/plans";

/**
 * Default plan when geo is unknown — keeps marketing RSC static/ISR-friendly
 * (no `headers()` opt-out of caching).
 */
export function defaultVisitorBillingPlan(): {
  plan: BillingPlan;
  countryCode: string | null;
  detected: boolean;
} {
  return {
    plan: resolveBillingPlanFromCountryCode(null),
    countryCode: null,
    detected: false,
  };
}

/**
 * Best-effort visitor region for marketing pricing.
 * Prefer middleware-injected `x-country-code` when present; never call `headers()`
 * from the homepage hot path — that forced full dynamic rendering.
 */
export async function resolveVisitorBillingPlan(): Promise<{
  plan: BillingPlan;
  countryCode: string | null;
  detected: boolean;
}> {
  // Lazy import so callers that only need `defaultVisitorBillingPlan` stay static.
  const { headers } = await import("next/headers");
  const h = await headers();
  const code =
    h.get("x-vercel-ip-country")?.trim() ||
    h.get("cf-ipcountry")?.trim() ||
    h.get("x-country-code")?.trim() ||
    null;

  const normalized =
    code && code.toUpperCase() !== "XX" && code.toUpperCase() !== "T1"
      ? code.toUpperCase()
      : null;

  return {
    plan: resolveBillingPlanFromCountryCode(normalized),
    countryCode: normalized,
    detected: Boolean(normalized),
  };
}
