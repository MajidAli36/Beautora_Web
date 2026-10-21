import { createClient } from "@/lib/supabase/server";
import { parseLocalDateRange } from "@/lib/dates/local";
import { getInventorySummary } from "@/lib/inventory/valuation";
import {
  SAFE_SALE_ID_CHUNK,
  chunkIds,
  fetchAllPages,
} from "@/lib/supabase/paginate";

/**
 * Chunked `.in(id, …)` with per-chunk range pagination so PostgREST max_rows
 * cannot silently truncate COGS / revenue splits.
 */
async function fetchInIdChunks<T>(
  ids: string[],
  fetchChunkPage: (
    chunk: string[],
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  idChunkSize = SAFE_SALE_ID_CHUNK
): Promise<T[]> {
  if (!ids.length) return [];
  const parts = await Promise.all(
    chunkIds(ids, idChunkSize).map((chunk) =>
      fetchAllPages<T>((from, to) => fetchChunkPage(chunk, from, to))
    )
  );
  return parts.flat();
}

export type ProductSalesMetrics = {
  unitsSold: number;
  retailRevenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  marginPercent: number;
};

export type InventoryMoneySnapshot = {
  inventoryValueAtCost: number;
  inventoryValueAtRetail: number;
  potentialProfitOnHand: number;
  totalUnitsOnHand: number;
  productSales: ProductSalesMetrics;
};

export type ProductSaleRow = {
  productId: string;
  name: string;
  sku: string | null;
  qtySold: number;
  retailRevenue: number;
  unitRetail: number;
  unitCost: number;
  costOfGoodsSold: number;
  grossProfit: number;
  marginPercent: number;
};

export type RevenueSplit = {
  services: number;
  products: number;
  packages: number;
  serviceQty: number;
  productQty: number;
  packageQty: number;
};

/** Per-product sales breakdown for reports (completed POS sales in range). */
export async function getProductSalesBreakdown(
  organizationId: string,
  from?: string,
  to?: string,
  prefetchedSaleIds?: string[]
): Promise<ProductSaleRow[]> {
  const supabase = await createClient();
  let saleIds = prefetchedSaleIds;
  if (!saleIds) {
    const { start, end } = parseLocalDateRange(from, to);
    const { data: sales } = await supabase
      .from("sales")
      .select("id")
      .eq("organization_id", organizationId)
      .in("status", ["COMPLETED", "AMENDED"])
      .is("deleted_at", null)
      .gte("completed_at", start.toISOString())
      .lte("completed_at", end.toISOString());
    saleIds = (sales ?? []).map((s) => s.id);
  }
  if (!saleIds.length) return [];

  const lines = await fetchInIdChunks<{
    item_id: string;
    name: string;
    quantity: number;
    line_total: number;
    unit_price: number;
    unit_cost: number | null;
  }>(saleIds, (chunk, from, to) =>
    supabase
      .from("sale_items")
      .select("item_id, name, quantity, line_total, unit_price, unit_cost")
      .eq("organization_id", organizationId)
      .eq("item_type", "PRODUCT")
      .in("sale_id", chunk)
      .range(from, to)
  );

  if (!lines.length) return [];

  const productIds = [...new Set(lines.map((l) => l.item_id))];
  const products = await fetchInIdChunks<{
    id: string;
    name: string;
    sku: string | null;
    cost_price: number;
    retail_price: number;
  }>(
    productIds,
    (chunk, from, to) =>
      supabase
        .from("products")
        .select("id, name, sku, cost_price, retail_price")
        .eq("organization_id", organizationId)
        .in("id", chunk)
        .range(from, to),
    200
  );

  const productMap = new Map(
    products.map((p) => [
      p.id,
      {
        name: p.name,
        sku: p.sku,
        cost: Number(p.cost_price) || 0,
        retail: Number(p.retail_price) || 0,
      },
    ])
  );

  const agg = new Map<
    string,
    {
      name: string;
      sku: string | null;
      qty: number;
      revenue: number;
      unitRetail: number;
      cogs: number;
    }
  >();

  for (const line of lines) {
    const meta = productMap.get(line.item_id);
    const existing = agg.get(line.item_id);
    const qty = Number(line.quantity) || 0;
    const revenue = Number(line.line_total) || 0;
    const unitRetail = Number(line.unit_price) || 0;
    const unitCost =
      line.unit_cost != null && Number(line.unit_cost) >= 0
        ? Number(line.unit_cost)
        : meta?.cost ?? 0;
    const lineCogs = qty * unitCost;

    if (existing) {
      existing.qty += qty;
      existing.revenue += revenue;
      existing.cogs += lineCogs;
    } else {
      agg.set(line.item_id, {
        name: meta?.name ?? line.name,
        sku: meta?.sku ?? null,
        qty,
        revenue,
        unitRetail: unitRetail || meta?.retail || 0,
        cogs: lineCogs,
      });
    }
  }

  return [...agg.entries()]
    .map(([productId, row]) => {
      const unitCost = row.qty > 0 ? row.cogs / row.qty : 0;
      const profit = row.revenue - row.cogs;
      const marginPercent = row.revenue > 0 ? Math.round((profit / row.revenue) * 100) : 0;
      return {
        productId,
        name: row.name,
        sku: row.sku,
        qtySold: row.qty,
        retailRevenue: row.revenue,
        unitRetail: row.unitRetail,
        unitCost,
        costOfGoodsSold: row.cogs,
        grossProfit: profit,
        marginPercent,
      };
    })
    .sort((a, b) => b.retailRevenue - a.retailRevenue);
}

/** Revenue split by sale line type for the selected period. */
export async function getRevenueSplit(
  organizationId: string,
  from?: string,
  to?: string,
  prefetchedSaleIds?: string[]
): Promise<RevenueSplit> {
  const supabase = await createClient();
  let saleIds = prefetchedSaleIds;
  if (!saleIds) {
    const { start, end } = parseLocalDateRange(from, to);
    const { data: sales } = await supabase
      .from("sales")
      .select("id")
      .eq("organization_id", organizationId)
      .in("status", ["COMPLETED", "AMENDED"])
      .is("deleted_at", null)
      .gte("completed_at", start.toISOString())
      .lte("completed_at", end.toISOString());
    saleIds = (sales ?? []).map((s) => s.id);
  }
  const empty: RevenueSplit = {
    services: 0,
    products: 0,
    packages: 0,
    serviceQty: 0,
    productQty: 0,
    packageQty: 0,
  };
  if (!saleIds.length) return empty;

  const lines = await fetchInIdChunks<{
    item_type: string;
    line_total: number;
    quantity: number;
  }>(saleIds, (chunk, from, to) =>
    supabase
      .from("sale_items")
      .select("item_type, line_total, quantity")
      .eq("organization_id", organizationId)
      .in("sale_id", chunk)
      .range(from, to)
  );

  const split = { ...empty };
  for (const line of lines) {
    const revenue = Number(line.line_total) || 0;
    const qty = Number(line.quantity) || 0;
    if (line.item_type === "SERVICE") {
      split.services += revenue;
      split.serviceQty += qty;
    } else if (line.item_type === "PRODUCT") {
      split.products += revenue;
      split.productQty += qty;
    } else if (line.item_type === "PACKAGE") {
      split.packages += revenue;
      split.packageQty += qty;
    }
  }
  return split;
}

/** COGS from in-house products consumed via services (actual sale_usage_lines snapshot).
 * Includes VOID/REFUNDED: cream was used and is no longer restored to stock (write-off). */
export async function getServiceUsageCogs(
  organizationId: string,
  from?: string,
  to?: string,
  prefetchedSaleIds?: string[]
): Promise<number> {
  const supabase = await createClient();
  let saleIds = prefetchedSaleIds;
  if (!saleIds) {
    const { start, end } = parseLocalDateRange(from, to);
    const { data: sales } = await supabase
      .from("sales")
      .select("id")
      .eq("organization_id", organizationId)
      .in("status", ["COMPLETED", "AMENDED", "VOID", "REFUNDED"])
      .is("deleted_at", null)
      .gte("completed_at", start.toISOString())
      .lte("completed_at", end.toISOString());
    saleIds = (sales ?? []).map((s) => s.id);
  }
  if (!saleIds.length) return 0;

  const usageLines = await fetchInIdChunks<{
    sale_id: string;
    quantity: number;
    unit_cost: number;
  }>(saleIds, (chunk, from, to) =>
    supabase
      .from("sale_usage_lines")
      .select("sale_id, quantity, unit_cost")
      .eq("organization_id", organizationId)
      .in("sale_id", chunk)
      .range(from, to)
  );

  const salesWithUsage = new Set<string>();
  let cogs = 0;
  for (const line of usageLines) {
    salesWithUsage.add(line.sale_id);
    const qty = Number(line.quantity) || 0;
    const unitCost = Number(line.unit_cost) || 0;
    cogs += qty * unitCost;
  }

  const legacySaleIds = saleIds.filter((id) => !salesWithUsage.has(id));
  if (legacySaleIds.length) {
    const postedLegacy = await fetchInIdChunks<{ id: string }>(
      legacySaleIds,
      (chunk, from, to) =>
        supabase
          .from("sales")
          .select("id")
          .eq("organization_id", organizationId)
          .in("id", chunk)
          .in("status", ["COMPLETED", "AMENDED"])
          .is("deleted_at", null)
          .range(from, to),
      200
    );
    const legacyPostedIds = postedLegacy.map((s) => s.id);
    if (legacyPostedIds.length) {
      const lines = await fetchInIdChunks<{ quantity: number; unit_cost: number }>(
        legacyPostedIds,
        (chunk, from, to) =>
          supabase
            .from("sale_items")
            .select("quantity, unit_cost")
            .eq("organization_id", organizationId)
            .in("item_type", ["SERVICE", "PACKAGE"])
            .in("sale_id", chunk)
            .range(from, to)
      );

      for (const line of lines) {
        const qty = Number(line.quantity) || 0;
        const unitCost = Number(line.unit_cost) || 0;
        cogs += qty * unitCost;
      }
    }
  }

  return Math.round(cogs * 100) / 100;
}

/** COGS & product revenue from completed POS sales in a date range. */
export async function getProductSalesMetrics(
  organizationId: string,
  from?: string,
  to?: string,
  prefetchedSaleIds?: string[]
): Promise<ProductSalesMetrics> {
  const supabase = await createClient();
  let saleIds = prefetchedSaleIds;
  if (!saleIds) {
    const { start, end } = parseLocalDateRange(from, to);
    const { data: sales } = await supabase
      .from("sales")
      .select("id")
      .eq("organization_id", organizationId)
      .in("status", ["COMPLETED", "AMENDED"])
      .is("deleted_at", null)
      .gte("completed_at", start.toISOString())
      .lte("completed_at", end.toISOString());
    saleIds = (sales ?? []).map((s) => s.id);
  }
  if (!saleIds.length) {
    return {
      unitsSold: 0,
      retailRevenue: 0,
      costOfGoodsSold: 0,
      grossProfit: 0,
      marginPercent: 0,
    };
  }

  const lines = await fetchInIdChunks<{
    item_id: string;
    quantity: number;
    line_total: number;
    unit_cost: number | null;
  }>(saleIds, (chunk, from, to) =>
    supabase
      .from("sale_items")
      .select("item_id, quantity, line_total, unit_cost")
      .eq("organization_id", organizationId)
      .eq("item_type", "PRODUCT")
      .in("sale_id", chunk)
      .range(from, to)
  );

  if (!lines.length) {
    return {
      unitsSold: 0,
      retailRevenue: 0,
      costOfGoodsSold: 0,
      grossProfit: 0,
      marginPercent: 0,
    };
  }

  const productIds = [...new Set(lines.map((l) => l.item_id))];
  const products = await fetchInIdChunks<{ id: string; cost_price: number }>(
    productIds,
    (chunk, from, to) =>
      supabase
        .from("products")
        .select("id, cost_price")
        .eq("organization_id", organizationId)
        .in("id", chunk)
        .range(from, to),
    200
  );

  const costMap = new Map(products.map((p) => [p.id, Number(p.cost_price) || 0]));

  let unitsSold = 0;
  let retailRevenue = 0;
  let costOfGoodsSold = 0;

  for (const line of lines) {
    const qty = Number(line.quantity) || 0;
    const revenue = Number(line.line_total) || 0;
    const unitCost =
      line.unit_cost != null && Number(line.unit_cost) >= 0
        ? Number(line.unit_cost)
        : costMap.get(line.item_id) ?? 0;
    unitsSold += qty;
    retailRevenue += revenue;
    costOfGoodsSold += qty * unitCost;
  }

  const grossProfit = retailRevenue - costOfGoodsSold;
  const marginPercent =
    retailRevenue > 0 ? Math.round((grossProfit / retailRevenue) * 100) : 0;

  return {
    unitsSold,
    retailRevenue,
    costOfGoodsSold,
    grossProfit,
    marginPercent,
  };
}

export async function getInventoryMoneySnapshot(
  organizationId: string,
  from?: string,
  to?: string,
  prefetchedSaleIds?: string[]
): Promise<InventoryMoneySnapshot> {
  const supabase = await createClient();

  const products = await fetchAllPages<{
    cost_price: number;
    retail_price: number;
    stock_quantity: number;
    low_stock_threshold: number;
    is_active: boolean;
  }>((from, to) =>
    supabase
      .from("products")
      .select("cost_price, retail_price, stock_quantity, low_stock_threshold, is_active")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("id")
      .range(from, to)
  );

  const summary = getInventorySummary(products);
  const productSales = await getProductSalesMetrics(
    organizationId,
    from,
    to,
    prefetchedSaleIds
  );

  return {
    inventoryValueAtCost: summary.totalValueAtCost,
    inventoryValueAtRetail: summary.totalValueAtRetail,
    potentialProfitOnHand: summary.totalPotentialProfit,
    totalUnitsOnHand: summary.totalUnits,
    productSales,
  };
}
