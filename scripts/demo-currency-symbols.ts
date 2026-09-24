/**
 * Quick check: country → code / symbol / formatted amount.
 * Run: npx tsx --tsconfig tsconfig.json scripts/demo-currency-symbols.ts
 */
import { currencyFromCountry } from "../lib/currency/from-country";
import { formatCurrency } from "../lib/format";

const samples = [
  "Pakistan",
  "India",
  "United Arab Emirates",
  "United States",
  "United Kingdom",
  "Saudi Arabia",
  "Bangladesh",
  "China",
  "Japan",
  "Germany",
];

for (const country of samples) {
  const cfg = currencyFromCountry(country);
  console.log(
    `${country.padEnd(24)} ${cfg.code.padEnd(5)} ${cfg.symbol.padEnd(6)} ${formatCurrency(1500, { country })}`
  );
}
