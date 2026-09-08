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
};

/** Expand SERVICE + PACKAGE lines into product quantities needed for in-house usage. */
export async function resolveServiceUsageRequirements(
  organizationId: string,
  lines: SaleLineForUsage[]
): Promise<{ requirements: UsageRequirement[]; error?: string }> {
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
  if (packageLines.length) {
    const packageIds = [...new Set(packageLines.map((l) => l.itemId))];
    const { data: pkgItems, error } = await supabase
      .from("package_items")
      .select("package_id, service_id, quantity")
      .eq("organization_id", organizationId)
      .in("package_id", packageIds);
    if (error) return { requirements: [], error: error.message };

    const pkgQtySold = new Map<string, number>();
    for (const line of packageLines) {
      pkgQtySold.set(line.itemId, (pkgQtySold.get(line.itemId) ?? 0) + Number(line.quantity));
    }

    for (const row of pkgItems ?? []) {
      const packagesSold = pkgQtySold.get(row.package_id) ?? 0;
      const servicesNeeded = packagesSold * Number(row.quantity);
      if (servicesNeeded <= 0) continue;
      neededByService.set(
        row.service_id,
        (neededByService.get(row.service_id) ?? 0) + servicesNeeded
      );
    }
  }

  if (!neededByService.size) return { requirements: [] };

  const serviceIds = [...neededByService.keys()];
  const { data: recipes, error: recipeErr } = await supabase
    .from("service_product_usage")
    .select("service_id, product_id, quantity_per_service")
    .eq("organization_id", organizationId)
    .in("service_id", serviceIds);
  if (recipeErr) return { requirements: [], error: recipeErr.message };
  if (!recipes?.length) return { requirements: [] };

  const productIds = [...new Set(recipes.map((r) => r.product_id))];
  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("id, name, cost_price, stock_quantity, is_active, deleted_at")
    .eq("organization_id", organizationId)
    .in("id", productIds);
  if (prodErr) return { requirements: [], error: prodErr.message };

  const productMap = new Map(
    (products ?? []).map((p) => [
      p.id,
      {
        name: p.name,
        cost: Number(p.cost_price) || 0,
        stock: Number(p.stock_quantity) || 0,
        ok: p.is_active && !p.deleted_at,
      },
    ])
  );

  const qtyByProduct = new Map<string, number>();
  for (const recipe of recipes) {
    const serviceQty = neededByService.get(recipe.service_id) ?? 0;
    if (serviceQty <= 0) continue;
    const add = roundQty(serviceQty * Number(recipe.quantity_per_service));
    if (add <= 0) continue;
    qtyByProduct.set(recipe.product_id, roundQty((qtyByProduct.get(recipe.product_id) ?? 0) + add));
  }

  const requirements: UsageRequirement[] = [];
  for (const [productId, quantity] of qtyByProduct) {
    const meta = productMap.get(productId);
    if (!meta || !meta.ok) {
      return {
        requirements: [],
        error: "An in-house product linked to a service is missing or inactive",
      };
    }
    requirements.push({
      productId,
      productName: meta.name,
      quantity,
      unitCost: meta.cost,
    });
  }

  return { requirements };
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
  const supabase = await createClient();
  for (const req of params.requirements) {
    if (req.quantity <= 0) continue;
    const { error } = await supabase.from("inventory_transactions").insert({
      organization_id: params.organizationId,
      product_id: req.productId,
      type: params.type,
      quantity: req.quantity,
      reference_type: params.referenceType,
      reference_id: params.saleId,
      notes: params.notes,
      created_by: params.userId,
    });
    if (error) {
      return {
        error: `In-house stock ${params.type === "OUT" ? "deduction" : "restore"} failed for ${req.productName}: ${error.message}`,
      };
    }
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

  for (const [productId, quantity] of net) {
    if (quantity <= 0.0005) continue;
    const { error: invErr } = await supabase.from("inventory_transactions").insert({
      organization_id: params.organizationId,
      product_id: productId,
      type: "IN",
      quantity,
      reference_type: params.referenceType,
      reference_id: params.saleId,
      notes: "In-house usage restored",
      created_by: params.userId,
    });
    if (invErr) return { error: `In-house stock restore failed: ${invErr.message}` };
  }
  return {};
}
