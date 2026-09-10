"use client";

import { useLayoutEffect } from "react";
import { currencyFromCountry, type CurrencyConfig } from "@/lib/currency/from-country";
import { bindClientCurrency } from "@/lib/currency/runtime";

type CurrencyProviderProps = {
  country?: string | null;
  currency?: CurrencyConfig;
  children: React.ReactNode;
};

/**
 * Binds salon currency for all client `formatCurrency` calls.
 * Country comes from organization Settings / onboarding.
 */
export function CurrencyProvider({ country, currency, children }: CurrencyProviderProps) {
  const config = currency ?? currencyFromCountry(country);

  // Sync before paint so first client render uses the right symbol.
  bindClientCurrency(config);

  useLayoutEffect(() => {
    bindClientCurrency(config);
  }, [config.code, config.locale]);

  return children;
}
