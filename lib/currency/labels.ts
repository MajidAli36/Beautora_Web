"use client";

import { getCurrencyConfig } from "@/lib/currency/runtime";

/** Live ISO currency code for form labels (PKR / INR / AED / USD…). */
export function useCurrencyCode(): string {
  return getCurrencyConfig().code;
}

/** Live display symbol (Rs / ₹ / $ / AED…). */
export function useCurrencySymbol(): string {
  return getCurrencyConfig().symbol;
}

/** e.g. "Price (Rs · PKR) *" */
export function priceFieldLabel(prefix = "Price", required = false): string {
  const { code, symbol } = getCurrencyConfig();
  const tag = symbol === code ? code : `${symbol} · ${code}`;
  return `${prefix} (${tag})${required ? " *" : ""}`;
}
