"use server";

import { createReportContext, getSupabase, cmp } from "@/lib/reports/context";
import type { CompareResult } from "@/lib/reports/range";

export type InHouseUsageProductRow = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  packSize: number | null;
  usePerClient: number | null;
  stockRemaining: number;
  stockValue: number;
  usedInPeriod: number;
  restoredInPeriod: number;
  netUsedInPeriod: number;
  usageCostInPeriod: number;
  clientsServedEst: number | null;
  clientsLeft: number | null;
  linkedServiceCount: number;
  status: "ok" | "low" | "out";
};

export type InHouseUsageTxnRow = {
  id: string;
  createdAt: string;
  productName: string;
  type: string;
  quantity: number;
  referenceType: string | null;
  unit: string;
  valueAtCost: number;
};

export type InHouseUsageReport = {
  from: string;
  to: string;
  generatedAt: string;
  kpis: {
    qtyUsed: CompareResult;
    usageCost: CompareResult;
    stockValue: CompareResult;
    lowStock: CompareResult;
    productsTracked: CompareResult;
  };
  products: InHouseUsageProductRow[];
  transactions: InHouseUsageTxnRow[];
  notes: string[];
};

function isUsageOut(ref: string | null) {
  const r = String(ref ?? "");
  return r === "service_usage" || r === "service_usage_amend";
}

function isUsageRestore(ref: string | null) {
  const r = String(ref ?? "");
  return (
    r === "service_usage_void" ||
    r === "service_usage_amend_reverse" ||
    r === "service_usage_restore"
  );
}

export async function getInHouseUsageReport(
  from?: string,
  to?: string
): Promise<InHouseUsageReport> {
  const ctx = await createReportContext(from, to);
  const supabase = await getSupabase();

  const [
    { data: products },
    { data: periodTxns },
    { data: prevTxns },
    { data: links },
  ] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, sku, stock_quantity, low_stock_threshold, cost_price, unit_label, pack_size, default_usage_qty, is_active"
      )
      .eq("organization_id", ctx.organizationId)
      .is("deleted_at", null)
      .in("product_kind", ["IN_HOUSE", "BOTH"]),
    supabase
      .from("inventory_transactions")
      .select(
        "id, created_at, type, quantity, reference_type, product_id, product:products(name, cost_price, unit_label, product_kind)"
      )
      .eq("organization_id", ctx.organizationId)
      .gte("created_at", ctx.start.toISOString())
      .lte("created_at", ctx.end.toISOString())
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("inventory_transactions")
      .select("type, quantity, reference_type, product_id, product:products(product_kind)")
      .eq("organization_id", ctx.organizationId)
      .gte("created_at", ctx.prevStart.toISOString())
      .lte("created_at", ctx.prevEnd.toISOString())
      .limit(1000),
    supabase
      .from("service_product_usage")
      .select("product_id")
      .eq("organization_id", ctx.organizationId),
  ]);

  const linkCount = new Map<string, number>();
  for (const row of links ?? []) {
    linkCount.set(row.product_id, (linkCount.get(row.product_id) ?? 0) + 1);
  }

  const usedByProduct = new Map<string, { used: number; restored: number }>();
  function addUsage(
    map: Map<string, { used: number; restored: number }>,
    productId: string,
    type: string,
    qty: number,
    ref: string | null
  ) {
    const cur = map.get(productId) ?? { used: 0, restored: 0 };
    if (type === "OUT" && isUsageOut(ref)) cur.used += qty;
    if (type === "IN" && isUsageRestore(ref)) cur.restored += qty;
    map.set(productId, cur);
  }

  for (const t of periodTxns ?? []) {
    const kind = (t.product as { product_kind?: string } | null)?.product_kind;
    if (kind !== "IN_HOUSE" && kind !== "BOTH") continue;
    addUsage(usedByProduct, t.product_id, t.type, Number(t.quantity) || 0, t.reference_type);
  }

  let prevUsed = 0;
  let prevCost = 0;
  const prevCostById = new Map(
    (products ?? []).map((p) => [p.id, Number(p.cost_price) || 0])
  );
  for (const t of prevTxns ?? []) {
    const kind = (t.product as { product_kind?: string } | null)?.product_kind;
    if (kind !== "IN_HOUSE" && kind !== "BOTH") continue;
    const qty = Number(t.quantity) || 0;
    const cost = prevCostById.get(t.product_id) ?? 0;
    if (t.type === "OUT" && isUsageOut(t.reference_type)) {
      prevUsed += qty;
      prevCost += qty * cost;
    }
    if (t.type === "IN" && isUsageRestore(t.reference_type)) {
      prevUsed -= qty;
      prevCost -= qty * cost;
    }
  }

  const rows: InHouseUsageProductRow[] = (products ?? [])
    .filter((p) => p.is_active)
    .map((p) => {
      const stock = Number(p.stock_quantity) || 0;
      const low = Number(p.low_stock_threshold) || 0;
      const cost = Number(p.cost_price) || 0;
      const useQty = Number(p.default_usage_qty) || 0;
      const pack = Number(p.pack_size) || 0;
      const unit = p.unit_label?.trim() || "unit";
      const u = usedByProduct.get(p.id) ?? { used: 0, restored: 0 };
      const net = Math.max(0, u.used - u.restored);
      let status: InHouseUsageProductRow["status"] = "ok";
      if (stock <= 0) status = "out";
      else if (stock <= low) status = "low";
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        unit,
        packSize: pack > 0 ? pack : null,
        usePerClient: useQty > 0 ? useQty : null,
        stockRemaining: stock,
        stockValue: stock * cost,
        usedInPeriod: u.used,
        restoredInPeriod: u.restored,
        netUsedInPeriod: net,
        usageCostInPeriod: net * cost,
        clientsServedEst: useQty > 0 ? Math.floor(net / useQty + 1e-9) : null,
        clientsLeft: useQty > 0 ? Math.floor(stock / useQty + 1e-9) : null,
        linkedServiceCount: linkCount.get(p.id) ?? 0,
        status,
      };
    })
    .sort((a, b) => b.netUsedInPeriod - a.netUsedInPeriod || a.name.localeCompare(b.name));

  const qtyUsed = rows.reduce((s, r) => s + r.netUsedInPeriod, 0);
  const usageCost = rows.reduce((s, r) => s + r.usageCostInPeriod, 0);
  const stockValue = rows.reduce((s, r) => s + r.stockValue, 0);
  const lowStock = rows.filter((r) => r.status === "low" || r.status === "out").length;

  const transactions: InHouseUsageTxnRow[] = (periodTxns ?? [])
    .filter((t) => {
      const kind = (t.product as { product_kind?: string } | null)?.product_kind;
      return kind === "IN_HOUSE" || kind === "BOTH";
    })
    .filter((t) => isUsageOut(t.reference_type) || isUsageRestore(t.reference_type) || t.reference_type === "manual")
    .slice(0, 100)
    .map((t) => {
      const product = t.product as {
        name?: string;
        cost_price?: number;
        unit_label?: string | null;
      } | null;
      const qty = Number(t.quantity) || 0;
      const cost = Number(product?.cost_price) || 0;
      const sign = t.type === "OUT" ? -1 : 1;
      return {
        id: t.id,
        createdAt: t.created_at,
        productName: product?.name ?? "—",
        type: t.type,
        quantity: qty,
        referenceType: t.reference_type,
        unit: product?.unit_label?.trim() || "unit",
        valueAtCost: sign * qty * cost,
      };
    });

  return {
    from: ctx.from,
    to: ctx.to,
    generatedAt: new Date().toISOString(),
    kpis: {
      qtyUsed: cmp(qtyUsed, Math.max(0, prevUsed)),
      usageCost: cmp(usageCost, Math.max(0, prevCost)),
      stockValue: cmp(stockValue, stockValue),
      lowStock: cmp(lowStock, lowStock),
      productsTracked: cmp(rows.length, rows.length),
    },
    products: rows,
    transactions,
    notes: [
      "Qty used is auto-deducted at POS when a linked service is sold (staff can override on checkout).",
      "Stock remaining is current on-hand. Period used is net of voids/refunds/amends that restore stock.",
    ],
  };
}
