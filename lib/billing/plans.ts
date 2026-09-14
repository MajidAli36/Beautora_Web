/**
 * Beautora subscription payment plans (USDT BEP-20).
 * Asia → $10 / month. All other countries → $15 / month.
 */

export type BillingMethod = "jazzcash" | "usdt_bep20";

export type BillingPlan = {
  method: BillingMethod;
  /** Numeric amount charged for one period */
  amount: number;
  currency: "PKR" | "USD";
  currencyLabel: string;
  /** Short price line e.g. "$10" or "$15" */
  priceLabel: string;
  /** Where to send payment (wallet address) */
  destination: string;
  destinationDisplay: string;
  networkLabel: string | null;
  title: string;
  instructions: string;
  refLabel: string;
  refPlaceholder: string;
  proofHint: string;
};

const USDT_WALLET = "0xc8f17c6fb16f2710cef016ee54d3144849547098";
const USDT_NETWORK = "BNB Smart Chain (BEP-20) · USDT";

export const ASIA_PLAN: BillingPlan = {
  method: "usdt_bep20",
  amount: 10,
  currency: "USD",
  currencyLabel: "$",
  priceLabel: "$10",
  destination: USDT_WALLET,
  destinationDisplay: USDT_WALLET,
  networkLabel: USDT_NETWORK,
  title: "Asia — $10 / month",
  instructions:
    "Send exactly $10 USDT on BNB Smart Chain (BEP-20) to the wallet below, then upload your transfer proof in Billing. Beautora unlocks the store after review.",
  refLabel: "Transaction hash / reference ID",
  refPlaceholder: "e.g. 0x… transaction hash",
  proofHint: "JPG, PNG, WebP, or PDF · max 5 MB. Wallet transfer screenshot preferred.",
};

export const STANDARD_PLAN: BillingPlan = {
  method: "usdt_bep20",
  amount: 15,
  currency: "USD",
  currencyLabel: "$",
  priceLabel: "$15",
  destination: USDT_WALLET,
  destinationDisplay: USDT_WALLET,
  networkLabel: USDT_NETWORK,
  title: "International — $15 / month",
  instructions:
    "Send exactly $15 USDT on BNB Smart Chain (BEP-20) to the wallet below, then upload your transfer proof in Billing. Beautora unlocks the store after review.",
  refLabel: "Transaction hash / reference ID",
  refPlaceholder: "e.g. 0x… transaction hash",
  proofHint: "JPG, PNG, WebP, or PDF · max 5 MB. Wallet transfer screenshot preferred.",
};

/** @deprecated Use ASIA_PLAN — kept for older imports */
export const PAKISTAN_PLAN = ASIA_PLAN;
/** @deprecated Use STANDARD_PLAN */
export const INTERNATIONAL_PLAN = STANDARD_PLAN;

/** Display names matching `WORLD_COUNTRIES` / org.country */
const ASIA_COUNTRY_NAMES = new Set(
  [
    "Afghanistan",
    "Armenia",
    "Azerbaijan",
    "Bahrain",
    "Bangladesh",
    "Bhutan",
    "Brunei",
    "Cambodia",
    "China",
    "Cyprus",
    "Georgia",
    "India",
    "Indonesia",
    "Iran",
    "Iraq",
    "Israel",
    "Japan",
    "Jordan",
    "Kazakhstan",
    "Kuwait",
    "Kyrgyzstan",
    "Laos",
    "Lebanon",
    "Malaysia",
    "Maldives",
    "Mongolia",
    "Myanmar",
    "Nepal",
    "North Korea",
    "Oman",
    "Pakistan",
    "Palestine",
    "Philippines",
    "Qatar",
    "Saudi Arabia",
    "Singapore",
    "South Korea",
    "Sri Lanka",
    "Syria",
    "Taiwan",
    "Tajikistan",
    "Thailand",
    "Timor-Leste",
    "Turkmenistan",
    "United Arab Emirates",
    "Uzbekistan",
    "Vietnam",
    "Yemen",
  ].map((n) => n.toLowerCase())
);

/** ISO 3166-1 alpha-2 (Vercel / Cloudflare geo) */
const ASIA_COUNTRY_CODES = new Set([
  "AF",
  "AM",
  "AZ",
  "BH",
  "BD",
  "BT",
  "BN",
  "KH",
  "CN",
  "CY",
  "GE",
  "IN",
  "ID",
  "IR",
  "IQ",
  "IL",
  "JP",
  "JO",
  "KZ",
  "KW",
  "KG",
  "LA",
  "LB",
  "MY",
  "MV",
  "MN",
  "MM",
  "NP",
  "KP",
  "OM",
  "PK",
  "PS",
  "PH",
  "QA",
  "SA",
  "SG",
  "KR",
  "LK",
  "SY",
  "TW",
  "TJ",
  "TH",
  "TL",
  "TM",
  "AE",
  "UZ",
  "VN",
  "YE",
]);

export function isAsiaCountry(country: string | null | undefined): boolean {
  const c = (country ?? "").trim().toLowerCase();
  if (!c) return false;
  if (ASIA_COUNTRY_NAMES.has(c)) return true;
  // Prefix match for variants like "Pakistan (Islamic Republic of)"
  for (const name of ASIA_COUNTRY_NAMES) {
    if (c === name || c.startsWith(`${name} `) || c.startsWith(`${name},`)) return true;
  }
  // ISO code accidentally stored as country
  if (c.length === 2 && ASIA_COUNTRY_CODES.has(c.toUpperCase())) return true;
  return false;
}

export function isAsiaCountryCode(code: string | null | undefined): boolean {
  return ASIA_COUNTRY_CODES.has((code ?? "").trim().toUpperCase());
}

/** @deprecated Use isAsiaCountry */
export function isPakistanCountry(country: string | null | undefined): boolean {
  return isAsiaCountry(country);
}

/** @deprecated Use isAsiaCountryCode */
export function isPakistanCountryCode(code: string | null | undefined): boolean {
  return isAsiaCountryCode(code);
}

export function resolveBillingPlanFromCountry(
  country: string | null | undefined
): BillingPlan {
  return isAsiaCountry(country) ? ASIA_PLAN : STANDARD_PLAN;
}

export function resolveBillingPlanFromCountryCode(
  code: string | null | undefined
): BillingPlan {
  return isAsiaCountryCode(code) ? ASIA_PLAN : STANDARD_PLAN;
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
  const cur = (currency ?? "USD").toUpperCase();
  if (cur === "USD") return `$${Number(amount).toLocaleString("en-US")}`;
  return `Rs ${Number(amount).toLocaleString("en-PK")}`;
}

/** Marketing one-liner: Asia $10 · elsewhere $15 */
export function subscriptionPriceMarketingLine(): string {
  return `$${ASIA_PLAN.amount} Asia · $${STANDARD_PLAN.amount} elsewhere (USDT)`;
}
