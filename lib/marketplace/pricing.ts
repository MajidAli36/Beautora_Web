/** Client-safe marketplace display price helpers. */

import { formatCurrency } from "@/lib/format";

export function effectiveProductPrice(p: {
  price: number;
  sale_price?: number | null;
}): number {
  const sale = p.sale_price != null ? Number(p.sale_price) : null;
  if (sale != null && sale >= 0 && sale < Number(p.price)) return sale;
  return Number(p.price);
}

/** Format marketplace amounts using the product/order currency (defaults PKR). */
export function formatMarketplaceMoney(
  n: number,
  currency: string | null | undefined = "PKR"
) {
  return formatCurrency(n, { currency: currency || "PKR" });
}
