import {
  currencyFromCountry,
  DEFAULT_CURRENCY,
  type CurrencyConfig,
} from "@/lib/currency/from-country";

/**
 * Client-safe currency binding.
 * Do NOT import node:async_hooks here — `formatCurrency` is used in client components.
 */

let activeCurrency: CurrencyConfig = DEFAULT_CURRENCY;

/** Optional server hook registered by `runtime.server` (never imported on client). */
type ServerStore = {
  get: () => CurrencyConfig | undefined;
  enter: (config: CurrencyConfig) => void;
  run: <T>(config: CurrencyConfig, fn: () => T) => T;
};

let serverStore: ServerStore | null = null;

/** Called only from server module to attach AsyncLocalStorage. */
export function __registerCurrencyServerStore(store: ServerStore): void {
  serverStore = store;
}

export function getCurrencyConfig(): CurrencyConfig {
  const fromServer = serverStore?.get();
  if (fromServer) return fromServer;
  return activeCurrency;
}

/** Bind currency for the current client tree (CurrencyProvider). */
export function bindClientCurrency(config: CurrencyConfig): void {
  activeCurrency = config;
}

export function bindClientCurrencyFromCountry(country: string | null | undefined): void {
  bindClientCurrency(currencyFromCountry(country));
}

export function enterCurrency(config: CurrencyConfig): void {
  if (serverStore) {
    serverStore.enter(config);
    return;
  }
  activeCurrency = config;
}

export function enterCurrencyFromCountry(country: string | null | undefined): void {
  enterCurrency(currencyFromCountry(country));
}

export function runWithCurrency<T>(config: CurrencyConfig, fn: () => T): T {
  if (serverStore) {
    return serverStore.run(config, fn);
  }
  const prev = activeCurrency;
  activeCurrency = config;
  try {
    return fn();
  } finally {
    activeCurrency = prev;
  }
}

export function runWithCountryCurrency<T>(
  country: string | null | undefined,
  fn: () => T
): T {
  return runWithCurrency(currencyFromCountry(country), fn);
}
