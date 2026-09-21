/** Client-safe marketplace display price helpers. */

export function effectiveProductPrice(p: {
  price: number;
  sale_price?: number | null;
}): number {
  const sale = p.sale_price != null ? Number(p.sale_price) : null;
  if (sale != null && sale >= 0 && sale < Number(p.price)) return sale;
  return Number(p.price);
}

export function formatMarketplaceMoney(n: number) {
  return `Rs ${n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
