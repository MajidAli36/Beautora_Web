import { createClient } from "@/lib/supabase/server";
import { roundMoney } from "@/lib/sales/calculate";
import { roundQty } from "@/lib/products/kinds";

export type SaleLineForUsage = {
  itemType: string;
  itemId: string;
  quantity: number;
};

export type UsageRequirement = {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  unitLabel?: string | null;
  source?: "RECIPE" | "OVERRIDE" | "MANUAL";
};

/** Expand SERVICE + PACKAGE lines into product quantities needed for in-house usage. */
export async function resolveServiceUsageRequirements(
  organizationId: string,
  lines: SaleLineForUsage[]
): Promise<{
  requirements: UsageRequirement[];
  /** Per-service recipe cost (one unit) — avoids a second recipe query at checkout. */
  serviceUnitCosts: Map<string, number>;
  error?: string;
}> {
  const empty = {
    requirements: [] as UsageRequirement[],
    serviceUnitCosts: new Map<string, number>(),
  };
  const supabase = await createClient();
  const neededByService = new Map<string, number>();

  const serviceLines = lines.filter((l) => l.itemType === "SERVICE");
  for (const line of serviceLines) {
    neededByService.set(
      line.itemId,
      (neededByService.get(line.itemId) ?? 0) + Number(line.quantity)
    );
  }

  const packageLines = lines.filter((l) => l.itemType === "PACKAGE");
  const packageIds = [...new Set(packageLines.map((l) => l.itemId))];
  const directServiceIds = [...neededByService.keys()];

  // Parallel: package expansion + recipes for direct service lines
  const [pkgRes, directRecipeRes] = await Promise.all([
    packageIds.length
      ? supabase
          .from("package_items")
          .select("package_id, service_id, quantity")
          .eq("organization_id", organizationId)
          .in("package_id", packageIds)
      : Promise.resolve({
          data: [] as { package_id: string; service_id: string; quantity: number }[],
          error: null as { message: string } | null,
        }),
    directServiceIds.length
      ? supabase
          .from("service_product_usage")
          .select("service_id, product_id, quantity_per_service")
          .eq("organization_id", organizationId)
          .in("service_id", directServiceIds)
      : Promise.resolve({
          data: [] as {
            service_id: string;
            product_id: string;
            quantity_per_service: number;
          }[],
          error: null as { message: string } | null,
        }),
  ]);

  if (pkgRes.error) return { ...empty, error: pkgRes.error.message };
  if (directRecipeRes.error) return { ...empty, error: directRecipeRes.error.message };

  if (packageLines.length) {
    const pkgQtySold = new Map<string, number>();
    for (const line of packageLines) {
      pkgQtySold.set(line.itemId, (pkgQtySold.get(line.itemId) ?? 0) + Number(line.quantity));
    }
    for (const row of pkgRes.data ?? []) {
      const packagesSold = pkgQtySold.get(row.package_id) ?? 0;
      const servicesNeeded = packagesSold * Number(row.quantity);
      if (servicesNeeded <= 0) continue;
      neededByService.set(
        row.service_id,
        (neededByService.get(row.service_id) ?? 0) + servicesNeeded
      );
    }
  }

  if (!neededByService.size) return empty;

  const allServiceIds = [...neededByService.keys()];
  const missingServiceIds = allServiceIds.filter((id) => !directServiceIds.includes(id));

  let recipes = [...(directRecipeRes.data ?? [])];
  if (missingServiceIds.length) {
    const { data: extraRecipes, error: recipeErr } = await supabase
      .from("service_product_usage")
      .select("service_id, product_id, quantity_per_service")
      .eq("organization_id", organizationId)
      .in("service_id", missingServiceIds);
    if (recipeErr) return { ...empty, error: recipeErr.message };
    recipes = recipes.concat(extraRecipes ?? []);
  }
  if (!recipes.length) return empty;

  const productIds = [...new Set(recipes.map((r) => r.product_id))];
  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("id, name, cost_price, stock_quantity, is_active, deleted_at, unit_label")
    .eq("organization_id", organizationId)
    .in("id", productIds);
  if (prodErr) return { ...empty, error: prodErr.message };

  const productMap = new Map(
    (products ?? []).map((p) => [
      p.id,
      {
        name: p.name,
        cost: Number(p.cost_price) || 0,
        stock: Number(p.stock_quantity) || 0,
        unitLabel: (p as { unit_label?: string | null }).unit_label ?? null,
        ok: p.is_active && !p.deleted_at,
      },
    ])
  );

  const serviceUnitCosts = new Map<string, number>();
  const qtyByProduct = new Map<string, number>();
  for (const recipe of recipes) {
    const perService = Number(recipe.quantity_per_service);
    const unitCost = perService * (productMap.get(recipe.product_id)?.cost ?? 0);
    serviceUnitCosts.set(
      recipe.service_id,
      roundMoney((serviceUnitCosts.get(recipe.service_id) ?? 0) + unitCost)
    );

    const serviceQty = neededByService.get(recipe.service_id) ?? 0;
    if (serviceQty <= 0) continue;
    const add = roundQty(serviceQty * perService);
    if (add <= 0) continue;
    qtyByProduct.set(recipe.product_id, roundQty((qtyByProduct.get(recipe.product_id) ?? 0) + add));
  }

  const requirements: UsageRequirement[] = [];
  for (const [productId, quantity] of qtyByProduct) {
    const meta = productMap.get(productId);
    if (!meta || !meta.ok) {
      return {
        ...empty,
        error: "An in-house product linked to a service is missing or inactive",
      };
    }
    requirements.push({
      productId,
      productName: meta.name,
      quantity,
      unitCost: meta.cost,
      unitLabel: meta.unitLabel,
      source: "RECIPE",
    });
  }

  return { requirements, serviceUnitCosts };
}

/**
 * Apply staff overrides on top of recipe requirements.
 * - Listed product with qty > 0 → use override qty (source OVERRIDE)
 * - Listed product with qty 0 → remove from usage
 * - Extra productIds not in recipe are allowed if they exist as IN_HOUSE/BOTH (manual add)
 */
export async function applyUsageOverrides(
  organizationId: string,
  base: UsageRequirement[],
  overrides?: { productId: string; quantity: number }[] | null
): Promise<{ requirements: UsageRequirement[]; error?: string }> {
  if (!overrides?.length) return { requirements: base };

  const supabase = await createClient();
  const map = new Map(base.map((r) => [r.productId, { ...r }]));
  const overrideIds = [...new Set(overrides.map((o) => o.productId))];

  const missingMetaIds = overrideIds.filter((id) => !map.has(id));
  if (missingMetaIds.length) {
    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, cost_price, is_active, deleted_at, unit_label, product_kind")
      .eq("organization_id", organizationId)
      .in("id", missingMetaIds);
    if (error) return { requirements: [], error: error.message };
    for (const p of products ?? []) {
      const kind = (p as { product_kind?: string }).product_kind;
      if (kind !== "IN_HOUSE" && kind !== "BOTH") {
        return {
          requirements: [],
          error: `${p.name} cannot be used as in-house stock (retail-only)`,
        };
      }
      if (!p.is_active || p.deleted_at) {
        return { requirements: [], error: `${p.name} is inactive` };
      }
      map.set(p.id, {
        productId: p.id,
        productName: p.name,
        quantity: 0,
        unitCost: Number(p.cost_price) || 0,
        unitLabel: (p as { unit_label?: string | null }).unit_label ?? null,
        source: "MANUAL",
      });
    }
    for (const id of missingMetaIds) {
      if (!map.has(id)) {
        return { requirements: [], error: "Unknown in-house product in usage override" };
      }
    }
  }

  for (const o of overrides) {
    const qty = roundQty(Math.max(0, Number(o.quantity) || 0));
    const existing = map.get(o.productId);
    if (!existing) continue;
    if (qty <= 0) {
      map.delete(o.productId);
      continue;
    }
    map.set(o.productId, {
      ...existing,
      quantity: qty,
      source: existing.source === "MANUAL" ? "MANUAL" : "OVERRIDE",
    });
  }

  return { requirements: [...map.values()].filter((r) => r.quantity > 0) };
}

export async function replaceSaleUsageLines(params: {
  organizationId: string;
  saleId: string;
  requirements: UsageRequirement[];
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error: delErr } = await supabase
    .from("sale_usage_lines")
    .delete()
    .eq("organization_id", params.organizationId)
    .eq("sale_id", params.saleId);
  if (delErr) return { error: delErr.message };

  const rows = params.requirements
    .filter((r) => r.quantity > 0)
    .map((r) => ({
      organization_id: params.organizationId,
      sale_id: params.saleId,
      product_id: r.productId,
      product_name: r.productName,
      quantity: r.quantity,
      unit_cost: roundMoney(r.unitCost),
      unit_label: r.unitLabel ?? null,
      source: r.source ?? "RECIPE",
    }));

  if (!rows.length) return {};

  const { error: insErr } = await supabase.from("sale_usage_lines").insert(rows);
  if (insErr) return { error: insErr.message };
  return {};
}

/** Prefer sale_usage_lines snapshot; fall back to net inventory OUT for older sales. */
export async function getRecordedSaleUsage(
  organizationId: string,
  saleId: string
): Promise<{ requirements: UsageRequirement[]; error?: string }> {
  const supabase = await createClient();
  const { data: lines, error } = await supabase
    .from("sale_usage_lines")
    .select("product_id, product_name, quantity, unit_cost, unit_label, source")
    .eq("organization_id", organizationId)
    .eq("sale_id", saleId);

  if (error) return { requirements: [], error: error.message };

  if (lines?.length) {
    return {
      requirements: lines.map((l) => ({
        productId: l.product_id,
        productName: l.product_name,
        quantity: Number(l.quantity),
        unitCost: Number(l.unit_cost) || 0,
        unitLabel: l.unit_label,
        source: (l.source as UsageRequirement["source"]) ?? "RECIPE",
      })),
    };
  }

  // Legacy fallback: net inventory movements
  const { data: outs } = await supabase
    .from("inventory_transactions")
    .select("product_id, quantity")
    .eq("organization_id", organizationId)
    .eq("reference_id", saleId)
    .eq("type", "OUT")
    .in("reference_type", ["service_usage", "service_usage_amend"]);

  const { data: ins } = await supabase
    .from("inventory_transactions")
    .select("product_id, quantity")
    .eq("organization_id", organizationId)
    .eq("reference_id", saleId)
    .eq("type", "IN")
    .in("reference_type", [
      "service_usage_void",
      "service_usage_amend_reverse",
      "service_usage_restore",
    ]);

  const net = new Map<string, number>();
  for (const row of outs ?? []) {
    net.set(row.product_id, roundQty((net.get(row.product_id) ?? 0) + Number(row.quantity)));
  }
  for (const row of ins ?? []) {
    net.set(row.product_id, roundQty((net.get(row.product_id) ?? 0) - Number(row.quantity)));
  }

  const productIds = [...net.keys()].filter((id) => (net.get(id) ?? 0) > 0.0005);
  if (!productIds.length) return { requirements: [] };

  const { data: products } = await supabase
    .from("products")
    .select("id, name, cost_price, unit_label")
    .eq("organization_id", organizationId)
    .in("id", productIds);

  const productMap = new Map(
    (products ?? []).map((p) => [
      p.id,
      {
        name: p.name,
        cost: Number(p.cost_price) || 0,
        unitLabel: (p as { unit_label?: string | null }).unit_label ?? null,
      },
    ])
  );

  return {
    requirements: productIds.map((productId) => {
      const meta = productMap.get(productId);
      return {
        productId,
        productName: meta?.name ?? "Product",
        quantity: net.get(productId) ?? 0,
        unitCost: meta?.cost ?? 0,
        unitLabel: meta?.unitLabel,
        source: "RECIPE" as const,
      };
    }),
  };
}

/** Material cost per single unit of a service (sum of recipe × cost). */
export async function getServiceUnitUsageCosts(
  organizationId: string,
  serviceIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!serviceIds.length) return map;
  const supabase = await createClient();
  const unique = [...new Set(serviceIds)];
  const { data: recipes } = await supabase
    .from("service_product_usage")
    .select("service_id, product_id, quantity_per_service")
    .eq("organization_id", organizationId)
    .in("service_id", unique);
  if (!recipes?.length) return map;

  const productIds = [...new Set(recipes.map((r) => r.product_id))];
  const { data: products } = await supabase
    .from("products")
    .select("id, cost_price")
    .eq("organization_id", organizationId)
    .in("id", productIds);
  const costMap = new Map((products ?? []).map((p) => [p.id, Number(p.cost_price) || 0]));

  for (const recipe of recipes) {
    const lineCost =
      Number(recipe.quantity_per_service) * (costMap.get(recipe.product_id) ?? 0);
    map.set(recipe.service_id, roundMoney((map.get(recipe.service_id) ?? 0) + lineCost));
  }
  return map;
}

/** Package unit usage cost = sum(service unit cost × package item qty). */
export async function getPackageUnitUsageCosts(
  organizationId: string,
  packageIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!packageIds.length) return map;
  const supabase = await createClient();
  const unique = [...new Set(packageIds)];
  const { data: pkgItems } = await supabase
    .from("package_items")
    .select("package_id, service_id, quantity")
    .eq("organization_id", organizationId)
    .in("package_id", unique);
  if (!pkgItems?.length) return map;

  const serviceCosts = await getServiceUnitUsageCosts(
    organizationId,
    pkgItems.map((i) => i.service_id)
  );

  for (const item of pkgItems) {
    const unit = (serviceCosts.get(item.service_id) ?? 0) * Number(item.quantity);
    map.set(item.package_id, roundMoney((map.get(item.package_id) ?? 0) + unit));
  }
  return map;
}

export function calculateUsageInventoryDelta(
  oldReqs: { productId: string; quantity: number }[],
  newReqs: { productId: string; quantity: number }[]
): { productId: string; delta: number }[] {
  const oldMap = new Map<string, number>();
  const newMap = new Map<string, number>();
  for (const r of oldReqs) {
    oldMap.set(r.productId, roundQty((oldMap.get(r.productId) ?? 0) + r.quantity));
  }
  for (const r of newReqs) {
    newMap.set(r.productId, roundQty((newMap.get(r.productId) ?? 0) + r.quantity));
  }
  const ids = new Set([...oldMap.keys(), ...newMap.keys()]);
  const result: { productId: string; delta: number }[] = [];
  for (const id of ids) {
    const delta = roundQty((newMap.get(id) ?? 0) - (oldMap.get(id) ?? 0));
    if (Math.abs(delta) > 0.0005) result.push({ productId: id, delta });
  }
  return result;
}

export async function applyServiceUsageInventory(params: {
  organizationId: string;
  saleId: string;
  requirements: UsageRequirement[];
  userId: string | null;
  type: "OUT" | "IN";
  referenceType: string;
  notes: string;
}): Promise<{ error?: string }> {
  const rows = params.requirements
    .filter((req) => req.quantity > 0)
    .map((req) => ({
      organization_id: params.organizationId,
      product_id: req.productId,
      type: params.type,
      quantity: req.quantity,
      reference_type: params.referenceType,
      reference_id: params.saleId,
      notes: params.notes,
      created_by: params.userId,
    }));
  if (!rows.length) return {};

  const supabase = await createClient();
  const { error } = await supabase.from("inventory_transactions").insert(rows);
  if (error) {
    return {
      error: `In-house stock ${params.type === "OUT" ? "deduction" : "restore"} failed: ${error.message}`,
    };
  }
  return {};
}

/** Restore usage by reversing recorded OUT rows for this sale (exact quantities). */
export async function reverseRecordedServiceUsage(params: {
  organizationId: string;
  saleId: string;
  userId: string | null;
  referenceType: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: outs, error } = await supabase
    .from("inventory_transactions")
    .select("product_id, quantity, reference_type")
    .eq("organization_id", params.organizationId)
    .eq("reference_id", params.saleId)
    .eq("type", "OUT")
    .in("reference_type", ["service_usage", "service_usage_amend"]);

  if (error) return { error: error.message };

  // Net OUT still outstanding: OUT minus prior IN restores for same sale
  const { data: ins } = await supabase
    .from("inventory_transactions")
    .select("product_id, quantity, reference_type")
    .eq("organization_id", params.organizationId)
    .eq("reference_id", params.saleId)
    .eq("type", "IN")
    .in("reference_type", [
      "service_usage_void",
      "service_usage_amend_reverse",
      "service_usage_restore",
    ]);

  const net = new Map<string, number>();
  for (const row of outs ?? []) {
    net.set(row.product_id, roundQty((net.get(row.product_id) ?? 0) + Number(row.quantity)));
  }
  for (const row of ins ?? []) {
    net.set(row.product_id, roundQty((net.get(row.product_id) ?? 0) - Number(row.quantity)));
  }

  const restoreRows = [...net.entries()]
    .filter(([, quantity]) => quantity > 0.0005)
    .map(([productId, quantity]) => ({
      organization_id: params.organizationId,
      product_id: productId,
      type: "IN" as const,
      quantity,
      reference_type: params.referenceType,
      reference_id: params.saleId,
      notes: "In-house usage restored",
      created_by: params.userId,
    }));

  if (restoreRows.length) {
    const { error: invErr } = await supabase
      .from("inventory_transactions")
      .insert(restoreRows);
    if (invErr) return { error: `In-house stock restore failed: ${invErr.message}` };
  }
  return {};
}

const IN_HOUSE_OUT_REFS = ["service_usage", "service_usage_amend"] as const;
const IN_HOUSE_IN_REFS = [
  "service_usage_void",
  "service_usage_amend_reverse",
  "service_usage_restore",
] as const;
const RETAIL_OUT_REFS = ["sale", "sale_amend", "sale_refund_compensate"] as const;
const RETAIL_IN_REFS = ["sale_void", "sale_amend_reverse", "sale_refund_full"] as const;

export type SaleStockMovement = {
  id: string;
  productId: string;
  productName: string;
  kind: "in_house" | "retail";
  type: "IN" | "OUT";
  quantity: number;
  referenceType: string;
  notes: string | null;
  createdAt: string;
  label: string;
};

export type SaleUsageLineStatus = UsageRequirement & {
  outstandingQty: number;
  stockStatus: "deducted" | "restored" | "partial";
};

export type SaleStockLedger = {
  usageLines: SaleUsageLineStatus[];
  usageRestored: boolean;
  usageHasAny: boolean;
  retailOutstanding: { productId: string; productName: string; quantity: number }[];
  retailRestored: boolean;
  retailHasAny: boolean;
  stockStatusLabel: string;
  movements: SaleStockMovement[];
};

function stockMovementLabel(
  kind: "in_house" | "retail",
  type: string,
  referenceType: string
): string {
  const ref = referenceType;
  if (kind === "in_house") {
    if (ref === "service_usage") return "POS deduct (recipe)";
    if (ref === "service_usage_amend") return "Amend deduct";
    if (ref === "service_usage_void") return "Restored — invoice deleted";
    if (ref === "service_usage_restore") return "Restored — full refund";
    if (ref === "service_usage_amend_reverse") return "Amend restore";
  } else {
    if (ref === "sale") return "POS retail sale";
    if (ref === "sale_amend") return "Amend retail OUT";
    if (ref === "sale_refund_compensate") return "Refund rollback (stock re-out)";
    if (ref === "sale_void") return "Restored — invoice deleted";
    if (ref === "sale_refund_full") return "Restored — full refund";
    if (ref === "sale_amend_reverse") return "Amend retail restore";
  }
  return `${type} · ${ref || "manual"}`;
}

function fingerprintServicePackageLines(
  lines: { itemType: string; itemId: string; quantity: number }[]
): string {
  return lines
    .filter((l) => l.itemType === "SERVICE" || l.itemType === "PACKAGE")
    .map((l) => `${l.itemType}:${l.itemId}:${roundQty(Number(l.quantity) || 0)}`)
    .sort()
    .join("|");
}

/** True when SERVICE/PACKAGE composition is unchanged (preserve POS usage overrides on amend). */
export function servicePackageLinesUnchanged(
  oldLines: { itemType: string; itemId: string; quantity: number }[],
  newLines: { itemType: string; itemId: string; quantity: number }[]
): boolean {
  return fingerprintServicePackageLines(oldLines) === fingerprintServicePackageLines(newLines);
}

/** Owner-facing ledger: what was used, what is still out, and every stock move for this invoice. */
export async function getSaleStockLedger(
  organizationId: string,
  saleId: string
): Promise<SaleStockLedger> {
  const supabase = await createClient();
  const recorded = await getRecordedSaleUsage(organizationId, saleId);

  const { data: txns } = await supabase
    .from("inventory_transactions")
    .select("id, product_id, type, quantity, reference_type, notes, created_at")
    .eq("organization_id", organizationId)
    .eq("reference_id", saleId)
    .order("created_at", { ascending: true });

  const productIdsForNames = [...new Set((txns ?? []).map((t) => t.product_id as string))];
  const nameById = new Map<string, string>();
  if (productIdsForNames.length) {
    const { data: products } = await supabase
      .from("products")
      .select("id, name")
      .eq("organization_id", organizationId)
      .in("id", productIdsForNames);
    for (const p of products ?? []) {
      nameById.set(p.id, p.name);
    }
  }

  const usageNet = new Map<string, number>();
  const retailNet = new Map<string, number>();
  const movements: SaleStockMovement[] = [];

  for (const t of txns ?? []) {
    const productId = t.product_id as string;
    const productName = nameById.get(productId) ?? "Product";
    const qty = Number(t.quantity) || 0;
    const ref = String(t.reference_type ?? "");
    const type = t.type as "IN" | "OUT";

    const isInHouse =
      IN_HOUSE_OUT_REFS.includes(ref as (typeof IN_HOUSE_OUT_REFS)[number]) ||
      IN_HOUSE_IN_REFS.includes(ref as (typeof IN_HOUSE_IN_REFS)[number]);
    const isRetail =
      RETAIL_OUT_REFS.includes(ref as (typeof RETAIL_OUT_REFS)[number]) ||
      RETAIL_IN_REFS.includes(ref as (typeof RETAIL_IN_REFS)[number]);

    if (isInHouse) {
      const signed = type === "OUT" ? qty : -qty;
      usageNet.set(productId, roundQty((usageNet.get(productId) ?? 0) + signed));
      movements.push({
        id: t.id,
        productId,
        productName,
        kind: "in_house",
        type,
        quantity: qty,
        referenceType: ref,
        notes: t.notes,
        createdAt: t.created_at,
        label: stockMovementLabel("in_house", type, ref),
      });
    } else if (isRetail) {
      const signed = type === "OUT" ? qty : -qty;
      retailNet.set(productId, roundQty((retailNet.get(productId) ?? 0) + signed));
      movements.push({
        id: t.id,
        productId,
        productName,
        kind: "retail",
        type,
        quantity: qty,
        referenceType: ref,
        notes: t.notes,
        createdAt: t.created_at,
        label: stockMovementLabel("retail", type, ref),
      });
    }
  }

  const snapshotById = new Map(recorded.requirements.map((r) => [r.productId, r]));
  const usageProductIds = new Set([
    ...snapshotById.keys(),
    ...[...usageNet.entries()].filter(([, q]) => Math.abs(q) > 0.0005).map(([id]) => id),
  ]);

  const usageLines: SaleUsageLineStatus[] = [...usageProductIds]
    .map((productId) => {
      const snap = snapshotById.get(productId);
      const outstandingQty = Math.max(0, usageNet.get(productId) ?? 0);
      const recordedQty = snap?.quantity ?? outstandingQty;
      let stockStatus: SaleUsageLineStatus["stockStatus"] = "deducted";
      if (recordedQty > 0.0005 && outstandingQty <= 0.0005) stockStatus = "restored";
      else if (outstandingQty + 0.0005 < recordedQty) stockStatus = "partial";
      else if (outstandingQty > 0.0005) stockStatus = "deducted";
      else stockStatus = "restored";

      return {
        productId,
        productName: snap?.productName ?? nameById.get(productId) ?? "Product",
        quantity: recordedQty || outstandingQty,
        unitCost: snap?.unitCost ?? 0,
        unitLabel: snap?.unitLabel ?? null,
        source: snap?.source ?? "RECIPE",
        outstandingQty,
        stockStatus,
      };
    })
    .filter((l) => l.quantity > 0.0005 || l.outstandingQty > 0.0005);

  const retailOutstanding = [...retailNet.entries()]
    .filter(([, q]) => q > 0.0005)
    .map(([productId, quantity]) => ({
      productId,
      productName: nameById.get(productId) ?? "Product",
      quantity,
    }));

  const usageHasAny = usageLines.length > 0 || movements.some((m) => m.kind === "in_house");
  const retailHasAny =
    retailOutstanding.length > 0 || movements.some((m) => m.kind === "retail");
  const usageOutstandingTotal = usageLines.reduce((s, l) => s + l.outstandingQty, 0);
  const usageRestored =
    usageHasAny &&
    usageOutstandingTotal <= 0.0005 &&
    movements.some((m) => m.kind === "in_house" && m.type === "IN");
  const retailEverOut = movements.some((m) => m.kind === "retail" && m.type === "OUT");
  const retailRestored = retailEverOut && retailOutstanding.length === 0;

  let stockStatusLabel = "No stock movements on this invoice";
  if (usageHasAny || retailHasAny) {
    const parts: string[] = [];
    if (usageHasAny) {
      parts.push(
        usageRestored
          ? "In-house usage restored to stock"
          : usageOutstandingTotal > 0
            ? "In-house usage still deducted"
            : "In-house usage recorded"
      );
    }
    if (retailHasAny) {
      parts.push(
        retailRestored
          ? "Retail product stock restored"
          : retailOutstanding.length
            ? "Retail product stock still out"
            : "Retail stock recorded"
      );
    }
    stockStatusLabel = parts.join(" · ");
  }

  return {
    usageLines,
    usageRestored,
    usageHasAny,
    retailOutstanding,
    retailRestored,
    retailHasAny,
    stockStatusLabel,
    movements: [...movements].reverse(),
  };
}
