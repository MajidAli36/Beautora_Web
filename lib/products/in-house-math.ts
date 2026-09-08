import { roundQty } from "@/lib/products/kinds";

/** Money round for per-unit cost (e.g. Rs 500 / 50 ml = 10). */
export function roundMoney(n: number): number {
  return Math.round((Number(n) || 0) * 10000) / 10000;
}

/**
 * Owner enters pack cost; DB stores cost per stock unit so
 * stock_value = stock_qty × cost_price and usage COGS stay correct.
 */
export function unitCostFromPackCost(packCost: number, packSize: number): number {
  const size = Number(packSize) || 0;
  const cost = Number(packCost) || 0;
  if (!(size > 0)) return roundMoney(cost);
  return roundMoney(cost / size);
}

/** Reverse of unitCostFromPackCost for edit forms. */
export function packCostFromUnitCost(unitCost: number, packSize: number): number {
  const size = Number(packSize) || 0;
  const cost = Number(unitCost) || 0;
  if (!(size > 0)) return roundMoney(cost);
  return roundMoney(cost * size);
}

/** Owner paid X for a bulk amount of stock → cost per unit. */
export function unitCostFromTotalPaid(totalPaid: number, totalQty: number): number {
  const qty = Number(totalQty) || 0;
  const paid = Number(totalPaid) || 0;
  if (!(qty > 0)) return 0;
  return roundMoney(paid / qty);
}

export function clientsPerPack(packSize: number, usePerClient: number): number | null {
  const pack = Number(packSize) || 0;
  const use = Number(usePerClient) || 0;
  if (!(pack > 0) || !(use > 0)) return null;
  return Math.floor(pack / use + 1e-9);
}

export function clientsLeft(stockQty: number, usePerClient: number): number | null {
  const stock = Number(stockQty) || 0;
  const use = Number(usePerClient) || 0;
  if (!(use > 0)) return null;
  return Math.floor(stock / use + 1e-9);
}

export function stockFromPacks(packSize: number, packsOnHand: number): number {
  return roundQty(Math.max(0, (Number(packSize) || 0) * (Number(packsOnHand) || 0)));
}
