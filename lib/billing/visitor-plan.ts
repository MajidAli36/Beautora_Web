import { headers } from "next/headers";
import {
  resolveBillingPlanFromCountryCode,
  type BillingPlan,
} from "@/lib/billing/plans";

/**
 * Best-effort visitor region for marketing pricing.
 * Uses Vercel / Cloudflare edge country headers when present.
 */
export async function resolveVisitorBillingPlan(): Promise<{
  plan: BillingPlan;
  countryCode: string | null;
  detected: boolean;
}> {
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
