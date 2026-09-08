"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMinimumRole } from "@/lib/auth/permissions";
import { requireOrganization } from "@/lib/auth/organization";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/commerce";
import type { Product, ProductCategory, ProductKind } from "@/types";
import {
  getInventorySummary,
  type InventorySummary,
} from "@/lib/inventory/valuation";
import { isProductKind, isSellableProductKind } from "@/lib/products/kinds";
import {
  unitCostFromPackCost,
  unitCostFromTotalPaid,
} from "@/lib/products/in-house-math";

const optionalPositive = z.preprocess((v) => {
  if (v === "" || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}, z.number().positive().optional());

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  description: z.string().optional(),
  category_id: z.string().optional(),
  product_kind: z.enum(["RETAIL", "IN_HOUSE", "BOTH"]).default("RETAIL"),
  cost_price: z.coerce.number().min(0),
  retail_price: z.coerce.number().min(0),
  stock_quantity: z.coerce.number().min(0).default(0),
  low_stock_threshold: z.coerce.number().min(0).default(5),
  is_active: z.coerce.boolean().default(true),
  unit_label: z.string().max(24).optional(),
  pack_size: optionalPositive,
  default_usage_qty: optionalPositive,
});

/**
 * In-house forms send cost_mode:
 * - pack: cost_price = cost of 1 pack → store cost per unit
 * - total: cost_price = paid for whole stock → store cost per unit
 * - unit / missing: cost_price already per stock unit (retail default)
 */
function resolveStoredCostPrice(
  formData: FormData,
  data: { cost_price: number; pack_size?: number; stock_quantity?: number; product_kind: string }
): number {
  const mode = String(formData.get("cost_mode") ?? "unit");
  if (mode === "pack" && data.pack_size && data.pack_size > 0) {
    return unitCostFromPackCost(data.cost_price, data.pack_size);
  }
  if (mode === "total") {
    const qty = Number(formData.get("stock_quantity") ?? data.stock_quantity) || 0;
    return unitCostFromTotalPaid(data.cost_price, qty);
  }
  return data.cost_price;
}

export async function createProductCategory(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const org = await requireMinimumRole("MANAGER");
  const name = formData.get("name") as string;
  if (!name?.trim()) return { error: "Name is required" };

  const supabase = await createClient();
  const { error } = await supabase.from("product_categories").insert({
    organization_id: org.organizationId,
    name: name.trim(),
    sort_order: Number(formData.get("sort_order") ?? 0),
  });
  if (error) return { error: error.message };
  revalidatePath("/products");
  return { success: true };
}

export async function deleteProductCategory(id: string): Promise<ActionResult> {
  const org = await requireMinimumRole("MANAGER");
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("product_categories")
    .select("id, name")
    .eq("id", id)
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!row) return { error: "Category not found" };

  const { resolveSoftDeleteActor, softDeleteEntity } = await import("@/lib/db/soft-delete");
  const actor = await resolveSoftDeleteActor();
  const result = await softDeleteEntity({
    table: "product_categories",
    id,
    organizationId: org.organizationId,
    actor,
    action: "product_category.delete",
    entityType: "product_category",
    summary: `Deleted product category ${row.name}`,
    before: row as unknown as Record<string, unknown>,
  });
  if (result.error) return { error: result.error };
  revalidatePath("/products");
  return { success: true };
}

export async function createProduct(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const org = await requireMinimumRole("MANAGER");
  const categoryId = formData.get("category_id") as string;
  const kindRaw = String(formData.get("product_kind") ?? "RETAIL");
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku") || undefined,
    description: formData.get("description") || undefined,
    category_id: categoryId && categoryId !== "none" ? categoryId : undefined,
    product_kind: isProductKind(kindRaw) ? kindRaw : "RETAIL",
    cost_price: formData.get("cost_price"),
    retail_price: formData.get("retail_price"),
    stock_quantity: formData.get("stock_quantity") ?? 0,
    low_stock_threshold: formData.get("low_stock_threshold") ?? 5,
    is_active: formData.get("is_active") === "on",
    unit_label: (formData.get("unit_label") as string) || undefined,
    pack_size: formData.get("pack_size") || undefined,
    default_usage_qty: formData.get("default_usage_qty") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  if (
    isSellableProductKind(parsed.data.product_kind) &&
    parsed.data.product_kind !== "IN_HOUSE" &&
    parsed.data.retail_price < 0
  ) {
    return { error: "Retail price is required for sellable products" };
  }

  const costPrice = resolveStoredCostPrice(formData, parsed.data);

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    organization_id: org.organizationId,
    category_id: parsed.data.category_id ?? null,
    sku: parsed.data.sku ?? null,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    product_kind: parsed.data.product_kind,
    cost_price: costPrice,
    retail_price: parsed.data.retail_price,
    stock_quantity: parsed.data.stock_quantity,
    low_stock_threshold: parsed.data.low_stock_threshold,
    is_active: parsed.data.is_active,
    unit_label: parsed.data.unit_label?.trim() || null,
    pack_size: parsed.data.pack_size ?? null,
    default_usage_qty: parsed.data.default_usage_qty ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath("/products");
  revalidatePath("/in-house");
  revalidatePath("/services");
  return { success: true };
}

const productUpdateSchema = productSchema.omit({ stock_quantity: true });

export async function updateProduct(
  id: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const org = await requireMinimumRole("MANAGER");
  const categoryId = formData.get("category_id") as string;
  const kindRaw = String(formData.get("product_kind") ?? "RETAIL");
  const parsed = productUpdateSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku") || undefined,
    description: formData.get("description") || undefined,
    category_id: categoryId && categoryId !== "none" ? categoryId : undefined,
    product_kind: isProductKind(kindRaw) ? kindRaw : "RETAIL",
    cost_price: formData.get("cost_price"),
    retail_price: formData.get("retail_price"),
    low_stock_threshold: formData.get("low_stock_threshold") ?? 5,
    is_active: formData.get("is_active") === "on",
    unit_label: (formData.get("unit_label") as string) || undefined,
    pack_size: formData.get("pack_size") || undefined,
    default_usage_qty: formData.get("default_usage_qty") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const costPrice = resolveStoredCostPrice(formData, parsed.data);

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      category_id: parsed.data.category_id ?? null,
      sku: parsed.data.sku ?? null,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      product_kind: parsed.data.product_kind,
      cost_price: costPrice,
      retail_price: parsed.data.retail_price,
      low_stock_threshold: parsed.data.low_stock_threshold,
      is_active: parsed.data.is_active,
      unit_label: parsed.data.unit_label?.trim() || null,
      pack_size: parsed.data.pack_size ?? null,
      default_usage_qty: parsed.data.default_usage_qty ?? null,
    })
    .eq("id", id)
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null);

  if (error) return { error: error.message };
  revalidatePath("/products");
  revalidatePath("/in-house");
  revalidatePath("/services");
  return { success: true };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const org = await requireMinimumRole("MANAGER");
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("products")
    .select("id, name, sku, retail_price, stock_quantity")
    .eq("id", id)
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!row) return { error: "Product not found" };

  const { resolveSoftDeleteActor, softDeleteEntity } = await import("@/lib/db/soft-delete");
  const actor = await resolveSoftDeleteActor();
  const result = await softDeleteEntity({
    table: "products",
    id,
    organizationId: org.organizationId,
    actor,
    action: "product.delete",
    entityType: "product",
    summary: `Deleted product ${row.name}`,
    before: row as unknown as Record<string, unknown>,
    extraPatch: { is_active: false },
  });
  if (result.error) return { error: result.error };
  revalidatePath("/products");
  return { success: true };
}

export async function adjustInventory(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const org = await requireMinimumRole("MANAGER");
  const productId = formData.get("product_id") as string;
  const type = formData.get("type") as "IN" | "OUT" | "ADJUSTMENT";
  const quantity = Number(formData.get("quantity"));
  const notes = (formData.get("notes") as string) || null;

  if (!productId || !type || !quantity || quantity <= 0) {
    return { error: "Invalid inventory adjustment" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("inventory_transactions").insert({
    organization_id: org.organizationId,
    product_id: productId,
    type,
    quantity,
    notes,
    created_by: user?.id ?? null,
    reference_type: "manual",
  });
  if (error) return { error: error.message };
  revalidatePath("/products");
  revalidatePath("/in-house");
  return { success: true };
}

export async function getProductCategories() {
  const org = await requireOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .order("sort_order")
    .order("name");
  if (error) throw new Error(error.message);
  return data as unknown as ProductCategory[];
}

export async function getProducts() {
  const org = await requireOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, category:product_categories(id, name)")
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .order("name");
  if (error) throw new Error(error.message);
  return data as unknown as (Product & { category: { id: string; name: string } | null })[];
}

/** Customer catalog (POS sellables). Pure in-house stock is managed under /in-house. */
export async function getRetailProducts() {
  const org = await requireOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, category:product_categories(id, name)")
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .in("product_kind", ["RETAIL", "BOTH"])
    .order("name");
  if (error) throw new Error(error.message);
  return data as unknown as (Product & { category: { id: string; name: string } | null })[];
}

export async function getInventoryTransactions(limit = 20) {
  const org = await requireOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_transactions")
    .select("*, product:products(id, name, sku, cost_price, retail_price)")
    .eq("organization_id", org.organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data as unknown as {
    id: string;
    type: string;
    quantity: number;
    reference_type: string | null;
    created_at: string;
    product: {
      id: string;
      name: string;
      sku: string | null;
      cost_price: number;
      retail_price: number;
    } | null;
  }[];
}

export async function getInventorySummaryStats(): Promise<InventorySummary> {
  const products = await getRetailProducts();
  return getInventorySummary(products);
}

export async function getLowStockCount() {
  const products = await getLowStockProducts();
  return products.length;
}

export async function getLowStockProducts() {
  const org = await requireOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, stock_quantity, low_stock_threshold")
    .eq("organization_id", org.organizationId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("stock_quantity");
  if (error) return [];
  return data
    .filter((p) => p.stock_quantity <= p.low_stock_threshold)
    .map((p) => ({
      id: p.id,
      name: p.name,
      stock: p.stock_quantity,
      threshold: p.low_stock_threshold,
    }));
}

export async function getPosCatalog() {
  const org = await requireOrganization();
  const supabase = await createClient();

  const [services, products, packages, customers, staff] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, price, duration_minutes")
      .eq("organization_id", org.organizationId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("products")
      .select("id, name, retail_price, stock_quantity, product_kind")
      .eq("organization_id", org.organizationId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .in("product_kind", ["RETAIL", "BOTH"])
      .order("name"),
    supabase
      .from("packages")
      .select("id, name, price")
      .eq("organization_id", org.organizationId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("customers")
      .select("id, first_name, last_name, phone")
      .eq("organization_id", org.organizationId)
      .is("deleted_at", null)
      .order("first_name")
      .limit(100),
    supabase
      .from("staff")
      .select("id, full_name")
      .eq("organization_id", org.organizationId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("full_name"),
  ]);

  return {
    services: services.data ?? [],
    products: (products.data ?? []).filter((p) =>
      isSellableProductKind((p as { product_kind?: ProductKind }).product_kind)
    ),
    packages: packages.data ?? [],
    customers: customers.data ?? [],
    staff: staff.data ?? [],
  };
}

/** Products that can be attached to a service recipe (in-house or both). */
export async function getConsumableProducts() {
  const org = await requireOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, cost_price, stock_quantity, product_kind, sku, unit_label, pack_size, default_usage_qty")
    .eq("organization_id", org.organizationId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .in("product_kind", ["IN_HOUSE", "BOTH"])
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** In-house + BOTH catalog for the owner In-house module. */
export async function getInHouseProducts() {
  const org = await requireOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "*, category:product_categories(id, name)"
    )
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .in("product_kind", ["IN_HOUSE", "BOTH"])
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type InHouseProductTxn = {
  id: string;
  type: string;
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
};

/** Single in-house product with usage totals + movement history. */
export async function getInHouseProductDetail(productId: string) {
  const org = await requireOrganization();
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .select("*, category:product_categories(id, name)")
    .eq("id", productId)
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .in("product_kind", ["IN_HOUSE", "BOTH"])
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!product) return null;

  const [{ data: txns }, { data: links }] = await Promise.all([
    supabase
      .from("inventory_transactions")
      .select("id, type, quantity, reference_type, reference_id, notes, created_at")
      .eq("organization_id", org.organizationId)
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("service_product_usage")
      .select("quantity_per_service, service:services(id, name, deleted_at, is_active)")
      .eq("organization_id", org.organizationId)
      .eq("product_id", productId),
  ]);

  let lifetimeUsed = 0;
  let lifetimeRestored = 0;
  let lifetimeStockIn = 0;
  let lifetimeManualOut = 0;

  for (const t of txns ?? []) {
    const qty = Number(t.quantity) || 0;
    const ref = String(t.reference_type ?? "");
    if (t.type === "OUT" && (ref.startsWith("service_usage") || ref === "sale")) {
      if (ref.startsWith("service_usage")) lifetimeUsed += qty;
      else lifetimeManualOut += qty;
    } else if (t.type === "IN" && ref.startsWith("service_usage")) {
      lifetimeRestored += qty;
    } else if (t.type === "IN" && (ref === "manual" || !ref)) {
      lifetimeStockIn += qty;
    } else if (t.type === "OUT" && ref === "manual") {
      lifetimeManualOut += qty;
    }
  }

  const netUsed = Math.max(0, lifetimeUsed - lifetimeRestored);
  const stock = Number(product.stock_quantity) || 0;
  const useQty = Number(product.default_usage_qty) || 0;
  const unitCost = Number(product.cost_price) || 0;
  const pack = Number(product.pack_size) || 0;

  const linkedServices = (links ?? [])
    .map((row) => {
      const service = row.service as {
        id: string;
        name: string;
        deleted_at: string | null;
        is_active: boolean;
      } | null;
      if (!service || service.deleted_at) return null;
      return {
        serviceId: service.id,
        serviceName: service.name,
        quantity: Number(row.quantity_per_service) || 0,
        isActive: service.is_active,
      };
    })
    .filter(Boolean) as {
    serviceId: string;
    serviceName: string;
    quantity: number;
    isActive: boolean;
  }[];

  return {
    product,
    linkedServices,
    transactions: (txns ?? []) as InHouseProductTxn[],
    stats: {
      stockRemaining: stock,
      unitLabel: (product.unit_label as string | null)?.trim() || "unit",
      packSize: pack > 0 ? pack : null,
      usePerClient: useQty > 0 ? useQty : null,
      clientsLeft: useQty > 0 ? Math.floor(stock / useQty + 1e-9) : null,
      netUsed,
      lifetimeUsed,
      lifetimeRestored,
      lifetimeStockIn,
      usageCost: netUsed * unitCost,
      stockValue: stock * unitCost,
      unitCost,
      autoDeduct: linkedServices.length > 0 && useQty > 0,
    },
  };
}

/** Preview recipe usage for a POS cart (before checkout). */
export async function previewCheckoutUsage(
  items: { itemType: string; itemId: string; quantity: number }[]
) {
  const org = await requireMinimumRole("CASHIER");
  const { resolveServiceUsageRequirements } = await import("@/lib/inventory/service-usage");
  return resolveServiceUsageRequirements(
    org.organizationId,
    items.map((i) => ({
      itemType: i.itemType,
      itemId: i.itemId,
      quantity: i.quantity,
    }))
  );
}
