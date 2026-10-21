/**
 * Marketplace product pricing & profit math (client + server safe).
 *
 * Column mapping (existing schema — do not invent parallel fields):
 * - costPrice     → marketplace_products.cost_price
 * - sellingPrice  → marketplace_products.price
 * - discountPrice → marketplace_products.sale_price (null = no discount)
 *
 * `unit_price` on order items is always the charged (effective) unit price.
 */

import { formatCurrency } from "@/lib/format";

export function roundMoney(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function roundPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export type MarketplacePriceInput = {
  /** Manufacturing / purchase cost per unit (private). */
  costPrice?: number | null;
  /** Normal retail / list price (`price`). */
  sellingPrice: number;
  /** Optional discounted price (`sale_price`). */
  discountPrice?: number | null;
  /** Available stock quantity. */
  quantity?: number | null;
};

export type MarketplacePriceBreakdown = {
  costPrice: number;
  sellingPrice: number;
  /** Normalized discount; null when no valid discount. */
  discountPrice: number | null;
  hasDiscount: boolean;
  effectiveSellingPrice: number;
  discountAmount: number;
  discountPercentage: number;
  profitPerUnit: number;
  normalProfitPerUnit: number;
  profitMarginPercentage: number;
  markupPercentage: number;
  stockValueAtCost: number;
  stockValueAtSellingPrice: number;
  potentialGrossProfit: number;
};

/** True only when discount is a real markdown: > 0 and strictly less than list. */
export function isValidDiscountPrice(
  sellingPrice: number,
  discountPrice: number | null | undefined
): boolean {
  if (discountPrice == null || !Number.isFinite(discountPrice)) return false;
  const sale = Number(discountPrice);
  const list = Number(sellingPrice);
  return sale > 0 && list > 0 && sale < list;
}

/**
 * Display / charge price. Sale applies only when it is a real discount
 * (strictly less than list). Equal or higher sale does not fake a discount.
 */
export function effectiveProductPrice(p: {
  price: number;
  sale_price?: number | null;
}): number {
  const list = Number(p.price);
  if (isValidDiscountPrice(list, p.sale_price)) {
    return roundMoney(Number(p.sale_price));
  }
  return roundMoney(list);
}

/** Normalize optional sale for persistence — never store a fake discount. */
export function normalizeDiscountPrice(
  sellingPrice: number,
  discountPrice: number | null | undefined
): number | null {
  if (discountPrice == null || discountPrice === ("" as unknown)) return null;
  const raw = Number(discountPrice);
  if (!Number.isFinite(raw)) return null;
  if (!isValidDiscountPrice(sellingPrice, raw)) return null;
  return roundMoney(raw);
}

export type MarketplacePricingValidation =
  | { ok: true; costPrice: number; sellingPrice: number; discountPrice: number | null }
  | { ok: false; error: string };

export function validateMarketplacePricing(input: {
  costPrice?: number | null;
  sellingPrice: number;
  discountPrice?: number | null;
  /** When false, sellingPrice may be 0 (legacy). Default: require > 0. */
  requireSellingPrice?: boolean;
}): MarketplacePricingValidation {
  const costRaw = input.costPrice;
  const costPrice =
    costRaw == null || (typeof costRaw === "string" && String(costRaw).trim() === "")
      ? 0
      : Number(costRaw);
  const sellingPrice = Number(input.sellingPrice);
  const discountRaw = input.discountPrice;
  const hasDiscountInput =
    discountRaw != null &&
    !(typeof discountRaw === "string" && String(discountRaw).trim() === "");

  if (!Number.isFinite(costPrice) || costPrice < 0) {
    return { ok: false, error: "Manufacturing / purchase cost must be zero or greater." };
  }
  if (!Number.isFinite(sellingPrice)) {
    return { ok: false, error: "Invalid selling price." };
  }
  if (input.requireSellingPrice !== false && !(sellingPrice > 0)) {
    return { ok: false, error: "Actual selling price must be greater than zero." };
  }
  if (sellingPrice < 0) {
    return { ok: false, error: "Selling price cannot be negative." };
  }

  if (hasDiscountInput) {
    const d = Number(discountRaw);
    if (!Number.isFinite(d) || !(d > 0)) {
      return { ok: false, error: "Discounted selling price must be greater than zero." };
    }
    if (d > sellingPrice) {
      return {
        ok: false,
        error: "Discounted selling price cannot be greater than the actual selling price.",
      };
    }
  }

  return {
    ok: true,
    costPrice: roundMoney(costPrice),
    sellingPrice: roundMoney(sellingPrice),
    discountPrice: normalizeDiscountPrice(sellingPrice, hasDiscountInput ? Number(discountRaw) : null),
  };
}

export function calculateMarketplacePricing(
  input: MarketplacePriceInput
): MarketplacePriceBreakdown {
  const costPrice = roundMoney(Math.max(0, Number(input.costPrice) || 0));
  const sellingPrice = roundMoney(Math.max(0, Number(input.sellingPrice) || 0));
  const qty = Math.max(0, Math.floor(Number(input.quantity) || 0));
  const discountPrice = normalizeDiscountPrice(sellingPrice, input.discountPrice);
  const hasDiscount = discountPrice != null;
  const effectiveSellingPrice = hasDiscount
    ? discountPrice
    : sellingPrice;
  const discountAmount = roundMoney(sellingPrice - effectiveSellingPrice);
  const discountPercentage =
    sellingPrice > 0 ? roundPercent((discountAmount / sellingPrice) * 100) : 0;
  const profitPerUnit = roundMoney(effectiveSellingPrice - costPrice);
  const normalProfitPerUnit = roundMoney(sellingPrice - costPrice);
  const profitMarginPercentage =
    effectiveSellingPrice > 0
      ? roundPercent((profitPerUnit / effectiveSellingPrice) * 100)
      : 0;
  const markupPercentage =
    costPrice > 0 ? roundPercent((profitPerUnit / costPrice) * 100) : 0;
  const stockValueAtCost = roundMoney(qty * costPrice);
  const stockValueAtSellingPrice = roundMoney(qty * effectiveSellingPrice);
  const potentialGrossProfit = roundMoney(
    stockValueAtSellingPrice - stockValueAtCost
  );

  return {
    costPrice,
    sellingPrice,
    discountPrice,
    hasDiscount,
    effectiveSellingPrice,
    discountAmount,
    discountPercentage,
    profitPerUnit,
    normalProfitPerUnit,
    profitMarginPercentage,
    markupPercentage,
    stockValueAtCost,
    stockValueAtSellingPrice,
    potentialGrossProfit,
  };
}

export type MarketplaceInventoryKpis = {
  totalProducts: number;
  activeProducts: number;
  productsOnSale: number;
  totalUnitsInStock: number;
  inventoryCostValue: number;
  potentialSalesValue: number;
  potentialGrossProfit: number;
  averageDiscountPercentage: number;
};

export function summarizeMarketplaceInventory(
  products: Array<{
    price: number;
    sale_price?: number | null;
    cost_price?: number | null;
    stock?: number | null;
    status?: string | null;
  }>
): MarketplaceInventoryKpis {
  let activeProducts = 0;
  let productsOnSale = 0;
  let totalUnitsInStock = 0;
  let inventoryCostValue = 0;
  let potentialSalesValue = 0;
  let discountPctSum = 0;
  let discountPctCount = 0;

  for (const p of products) {
    const qty = Math.max(0, Math.floor(Number(p.stock) || 0));
    const calc = calculateMarketplacePricing({
      costPrice: p.cost_price,
      sellingPrice: Number(p.price) || 0,
      discountPrice: p.sale_price,
      quantity: qty,
    });
    if (p.status === "published") activeProducts += 1;
    if (calc.hasDiscount) {
      productsOnSale += 1;
      discountPctSum += calc.discountPercentage;
      discountPctCount += 1;
    }
    totalUnitsInStock += qty;
    inventoryCostValue += calc.stockValueAtCost;
    potentialSalesValue += calc.stockValueAtSellingPrice;
  }

  return {
    totalProducts: products.length,
    activeProducts,
    productsOnSale,
    totalUnitsInStock,
    inventoryCostValue: roundMoney(inventoryCostValue),
    potentialSalesValue: roundMoney(potentialSalesValue),
    potentialGrossProfit: roundMoney(potentialSalesValue - inventoryCostValue),
    averageDiscountPercentage:
      discountPctCount > 0
        ? roundPercent(discountPctSum / discountPctCount)
        : 0,
  };
}

/** Realized gross profit for one order line (charged price − cost snapshot). */
export function lineItemGrossProfit(item: {
  unit_price: number;
  unit_cost?: number | null;
  quantity: number;
  fulfillment_status?: string | null;
}): number {
  if (item.fulfillment_status === "cancelled") return 0;
  const qty = Math.max(0, Math.floor(Number(item.quantity) || 0));
  const unitPrice = roundMoney(Number(item.unit_price) || 0);
  const unitCost = roundMoney(Math.max(0, Number(item.unit_cost) || 0));
  return roundMoney((unitPrice - unitCost) * qty);
}

/**
 * Platform fee on gross sales proceeds (not on profit).
 * Today the default rate is 0 → seller keeps 100%. When settings later use e.g. 0.10,
 * the same helpers deduct 10% of revenue for estimates and net-to-seller views.
 * Actual ledger still uses recordDeliveryLedger (credit gross, debit commission once).
 */
export function platformCommissionOnAmount(
  grossAmount: number,
  commissionRate: number
): number {
  const gross = roundMoney(Math.max(0, Number(grossAmount) || 0));
  const rate = Math.max(0, Number(commissionRate) || 0);
  if (rate <= 0 || gross <= 0) return 0;
  return roundMoney(gross * rate);
}

export type SellerNetAfterCommission = {
  commissionRate: number;
  commissionAmount: number;
  /** Revenue after platform fee (what seller receives from sales). */
  sellerNetProceeds: number;
  /**
   * Gross profit after platform fee on revenue:
   * (revenue − COGS) − commission = grossProfit − commission.
   */
  sellerNetProfit: number;
};

/** Split gross revenue / gross profit into platform fee vs seller keep. */
export function sellerNetAfterCommission(input: {
  revenue: number;
  grossProfit: number;
  commissionRate: number;
}): SellerNetAfterCommission {
  const revenue = roundMoney(Math.max(0, Number(input.revenue) || 0));
  const grossProfit = roundMoney(Number(input.grossProfit) || 0);
  const commissionRate = Math.max(0, Number(input.commissionRate) || 0);
  const commissionAmount = platformCommissionOnAmount(revenue, commissionRate);
  return {
    commissionRate,
    commissionAmount,
    sellerNetProceeds: roundMoney(revenue - commissionAmount),
    sellerNetProfit: roundMoney(grossProfit - commissionAmount),
  };
}

export type MarketplaceInventoryKpisWithCommission = MarketplaceInventoryKpis &
  SellerNetAfterCommission;

/** Inventory estimates + optional platform fee (0% = full amount to seller). */
export function applyCommissionToInventoryKpis(
  kpis: MarketplaceInventoryKpis,
  commissionRate: number
): MarketplaceInventoryKpisWithCommission {
  const net = sellerNetAfterCommission({
    revenue: kpis.potentialSalesValue,
    grossProfit: kpis.potentialGrossProfit,
    commissionRate,
  });
  return { ...kpis, ...net };
}

/** Format marketplace amounts using the product/order currency (defaults PKR). */
export function formatMarketplaceMoney(
  n: number,
  currency: string | null | undefined = "PKR"
) {
  return formatCurrency(n, { currency: currency || "PKR" });
}

/** Public-facing discount % for cards/PDP — 0 when no real discount. */
export function publicDiscountPercentage(p: {
  price: number;
  sale_price?: number | null;
}): number {
  return calculateMarketplacePricing({
    sellingPrice: Number(p.price) || 0,
    discountPrice: p.sale_price,
  }).discountPercentage;
}
