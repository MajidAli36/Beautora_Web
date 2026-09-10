/**
 * Server-only currency ALS. Import this from server layouts / actions / organization.
 * Side-effect: registers AsyncLocalStorage with the shared runtime.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import type { CurrencyConfig } from "@/lib/currency/from-country";
import {
  __registerCurrencyServerStore,
  enterCurrencyFromCountry as enterFromShared,
  runWithCountryCurrency as runCountryFromShared,
  runWithCurrency as runFromShared,
} from "@/lib/currency/runtime";

const als = new AsyncLocalStorage<CurrencyConfig>();

__registerCurrencyServerStore({
  get: () => als.getStore(),
  enter: (config) => {
    if (typeof als.enterWith === "function") {
      als.enterWith(config);
    }
  },
  run: (config, fn) => als.run(config, fn),
});

export {
  enterFromShared as enterCurrencyFromCountry,
  runFromShared as runWithCurrency,
  runCountryFromShared as runWithCountryCurrency,
};
