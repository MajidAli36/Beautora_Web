/**
 * Beautora subscription payment plans.
 * Pakistan → JazzCash (PKR). All other countries → USDT on BNB Smart Chain (BEP-20).
 */

export type BillingMethod = "jazzcash" | "usdt_bep20";

export type BillingPlan = {
  method: BillingMethod;
  /** Numeric amount charged for one period */
  amount: number;
  currency: "PKR" | "USD";
  currencyLabel: string;
  /** Short price line e.g. "Rs 3,000" or "$15" */
  priceLabel: string;
  /** Where to send payment (JazzCash number or wallet) */
  destination: string;
  destinationDisplay: string;
  networkLabel: string | null;
  title: string;
  instructions: string;
  refLabel: string;
  refPlaceholder: string;
  proofHint: string;
};

export const PAKISTAN_PLAN: BillingPlan = {
  method: "jazzcash",
  amount: 3000,
  currency: "PKR",
  currencyLabel: "Rs",
  priceLabel: "Rs 3,000",
  destination: "03226400409",
  destinationDisplay: "0322 6400409",
  networkLabel: null,
  title: "JazzCash (Pakistan)",
  instructions:
    "Send Rs 3,000 via JazzCash, then upload your transfer proof in Billing. Beautora unlocks the store after review.",
  refLabel: "JazzCash transaction / reference ID",
  refPlaceholder: "e.g. 1234567890",
  proofHint: "JPG, PNG, WebP, or PDF · max 5 MB. JazzCash confirmation screenshot preferred.",
};

export const INTERNATIONAL_PLAN: BillingPlan = {
  method: "usdt_bep20",
  amount: 15,
  currency: "USD",
  currencyLabel: "$",
  priceLabel: "$15",
  destination: "0xc8f17c6fb16f2710cef016ee54d3144849547098",
  destinationDisplay: "0xc8f17c6fb16f2710cef016ee54d3144849547098",
  networkLabel: "BNB Smart Chain (BEP-20) · USDT",
  title: "USDT (international)",
  instructions:
    "Send exactly $15 USDT on BNB Smart Chain (BEP-20) to the wallet below, then upload your transfer proof in Billing. Beautora unlocks the store after review.",
  refLabel: "Transaction hash / reference ID",
  refPlaceholder: "e.g. 0x… transaction hash",
  proofHint: "JPG, PNG, WebP, or PDF · max 5 MB. Wallet transfer screenshot preferred.",
};

export function isPakistanCountry(country: string | null | undefined): boolean {
  const c = (country ?? "").trim().toLowerCase();
  if (!c) return false;
  return (
    c === "pakistan" ||
    c === "pk" ||
    c === "pak" ||
    c.startsWith("pakistan")
  );
}

/** ISO country code (e.g. from Vercel/Cloudflare geo) */
export function isPakistanCountryCode(code: string | null | undefined): boolean {
  return (code ?? "").trim().toUpperCase() === "PK";
}

export function resolveBillingPlanFromCountry(
  country: string | null | undefined
): BillingPlan {
  return isPakistanCountry(country) ? PAKISTAN_PLAN : INTERNATIONAL_PLAN;
}

export function resolveBillingPlanFromCountryCode(
  code: string | null | undefined
): BillingPlan {
  return isPakistanCountryCode(code) ? PAKISTAN_PLAN : INTERNATIONAL_PLAN;
}

export function formatPlanAmount(plan: BillingPlan): string {
  if (plan.currency === "PKR") {
    return `${plan.currencyLabel} ${plan.amount.toLocaleString("en-PK")}`;
  }
  return `${plan.currencyLabel}${plan.amount}`;
}

export function formatStoredPaymentAmount(
  amount: number,
  currency: string | null | undefined
): string {
  const cur = (currency ?? "PKR").toUpperCase();
  if (cur === "USD") return `$${Number(amount).toLocaleString("en-US")}`;
  return `Rs ${Number(amount).toLocaleString("en-PK")}`;
}
