"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAction } from "@/lib/auth/permissions";
import { requireOrganization } from "@/lib/auth/organization";
import { revalidateProducts } from "@/lib/cache/revalidate";
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
  const org = await requireAction("products.create");
  const name = formData.get("name") as string;
  if (!name?.trim()) return { error: "Name is required" };

  const supabase = await createClient();
  const trimmed = name.trim();
  const sortOrder = Number(formData.get("sort_order") ?? 0);
  const { restoreSoftDeletedByName } = await import("@/lib/db/restore-soft-deleted");
  const restored = await restoreSoftDeletedByName({
    client: supabase,
    table: "product_categories",
    organizationId: org.organizationId,
    name: trimmed,
    extraUpdate: { sort_order: sortOrder },
  });
  if (restored) {
    revalidateProducts();
    return { success: true };
  }

  const { error } = await supabase.from("product_categories").insert({
    organization_id: org.organizationId,
    name: trimmed,
    sort_order: sortOrder,
  });
  if (error) {
    if (error.code === "23505") {
      const again = await restoreSoftDeletedByName({
        client: supabase,
        table: "product_categories",
        organizationId: org.organizationId,
        name: trimmed,
        extraUpdate: { sort_order: sortOrder },
      });
      if (again) {
        revalidateProducts();
        return { success: true };
      }
      return { error: "A category with this name already exists" };
    }
    return { error: error.message };
  }
  revalidateProducts();
  return { success: true };
}

export async function deleteProductCategory(id: string): Promise<ActionResult> {
  const org = await requireAction("products.delete");
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
  revalidateProducts();
  return { success: true };
}

export async function createProduct(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const org = await requireAction("products.create");
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
  const openingStock = Number(parsed.data.stock_quantity) || 0;
  const productName = parsed.data.name.trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // products has no unique(name) — never restore beside an active same-name row.
  const { data: activeSame } = await supabase
    .from("products")
    .select("id")
    .eq("organization_id", org.organizationId)
    .eq("name", productName)
    .is("deleted_at", null)
    .maybeSingle();
  if (activeSame) {
    return { error: "A product with this name already exists" };
  }

  const { restoreSoftDeletedByName } = await import("@/lib/db/restore-soft-deleted");
  // Only wipe on-hand when the form supplies a new opening qty (>0).
  // Opening 0 on restore keeps prior stock so recreate does not silently zero inventory.
  const restored = await restoreSoftDeletedByName({
    client: supabase,
    table: "products",
    organizationId: org.organizationId,
    name: productName,
    extraUpdate: {
      category_id: parsed.data.category_id ?? null,
      sku: parsed.data.sku?.trim() || null,
      description: parsed.data.description ?? null,
      product_kind: parsed.data.product_kind,
      cost_price: costPrice,
      retail_price: parsed.data.retail_price,
      ...(openingStock > 0 ? { stock_quantity: 0 } : {}),
      low_stock_threshold: parsed.data.low_stock_threshold,
      is_active: parsed.data.is_active,
      unit_label: parsed.data.unit_label?.trim() || null,
      pack_size: parsed.data.pack_size ?? null,
      default_usage_qty: parsed.data.default_usage_qty ?? null,
    },
  });

  let created: { id: string } | null = restored;
  if (!created) {
    // Insert at 0, then record opening stock as IN so inventory history is correct.
    const { data, error } = await supabase
      .from("products")
      .insert({
        organization_id: org.organizationId,
        category_id: parsed.data.category_id ?? null,
        sku: parsed.data.sku?.trim() || null,
        name: productName,
        description: parsed.data.description ?? null,
        product_kind: parsed.data.product_kind,
        cost_price: costPrice,
        retail_price: parsed.data.retail_price,
        stock_quantity: 0,
        low_stock_threshold: parsed.data.low_stock_threshold,
        is_active: parsed.data.is_active,
        unit_label: parsed.data.unit_label?.trim() || null,
        pack_size: parsed.data.pack_size ?? null,
        default_usage_qty: parsed.data.default_usage_qty ?? null,
      })
      .select("id")
      .single();
    if (error || !data) {
      return { error: error?.message ?? "Could not create product" };
    }
    created = data;
  }

  if (openingStock > 0) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    let admin;
    try {
      admin = createAdminClient();
    } catch {
      revalidateProducts();
      return {
        error:
          "Product saved but opening stock failed (missing SUPABASE_SERVICE_ROLE_KEY). Use Restock / adjust.",
      };
    }
    const { error: invErr } = await admin.from("inventory_transactions").insert({
      organization_id: org.organizationId,
      product_id: created.id,
      type: "IN",
      quantity: openingStock,
      notes: "Opening stock",
      created_by: user?.id ?? null,
      reference_type: "opening",
    });
    if (invErr) {
      revalidateProducts();
      return {
        error: `Product saved but opening stock failed: ${invErr.message}. Use Restock / adjust.`,
      };
    }
    const { data: afterOpen } = await admin
      .from("products")
      .select("stock_quantity")
      .eq("id", created.id)
      .maybeSingle();
    const openQty = Number(afterOpen?.stock_quantity);
    if (!Number.isFinite(openQty) || Math.abs(openQty - openingStock) > 0.0005) {
      const { data: forced, error: stockErr } = await admin
        .from("products")
        .update({
          stock_quantity: openingStock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", created.id)
        .eq("organization_id", org.organizationId)
        .select("stock_quantity")
        .maybeSingle();
      if (stockErr || !forced) {
        revalidateProducts();
        return {
          error: `Product saved but opening qty did not stick: ${
            stockErr?.message ?? "no row updated"
          }. Use Restock / adjust.`,
        };
      }
    }
  }

  revalidateProducts();
  revalidatePath("/services");
  return { success: true };
}

const productUpdateSchema = productSchema.omit({ stock_quantity: true });

export async function updateProduct(
  id: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const org = await requireAction("products.edit");
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
  const { data: updated, error } = await supabase
    .from("products")
    .update({
      category_id: parsed.data.category_id ?? null,
      sku: parsed.data.sku?.trim() || null,
      name: parsed.data.name.trim(),
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
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!updated) return { error: "Product not found or already deleted" };

  // Optional qty update from Edit (in-house): keep | set | add | add_bottles.
  const qtyMode = String(formData.get("stock_qty_mode") ?? "keep").trim();
  const stockRaw = formData.get("stock_quantity");
  const shouldTouchStock =
    qtyMode === "set" ||
    qtyMode === "add" ||
    qtyMode === "add_bottles" ||
    (qtyMode !== "keep" && stockRaw != null && String(stockRaw).trim() !== "");

  if (shouldTouchStock && qtyMode !== "keep") {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    let admin;
    try {
      admin = createAdminClient();
    } catch {
      return {
        error:
          "Product saved but stock could not update (missing SUPABASE_SERVICE_ROLE_KEY).",
      };
    }
    const { data: current } = await admin
      .from("products")
      .select("stock_quantity, pack_size")
      .eq("id", id)
      .eq("organization_id", org.organizationId)
      .is("deleted_at", null)
      .maybeSingle();
    const before = Number(current?.stock_quantity) || 0;
    const packSize =
      Number(formData.get("pack_size")) || Number(current?.pack_size) || 0;

    let nextStock = before;
    if (qtyMode === "set" || (qtyMode !== "add" && qtyMode !== "add_bottles")) {
      nextStock = Number(stockRaw);
    } else if (qtyMode === "add") {
      const addQty = Number(formData.get("stock_add_qty") ?? stockRaw);
      if (!Number.isFinite(addQty) || addQty < 0) {
        return { error: "Add quantity must be 0 or more" };
      }
      nextStock = before + addQty;
    } else if (qtyMode === "add_bottles") {
      const bottles = Number(formData.get("stock_add_bottles") ?? 0);
      if (!Number.isFinite(bottles) || bottles < 0) {
        return { error: "Bottle count must be 0 or more" };
      }
      if (packSize <= 0) {
        return { error: "Set bottle size (ml per bottle) before adding bottles" };
      }
      nextStock = before + bottles * packSize;
    }

    if (!Number.isFinite(nextStock) || nextStock < 0) {
      return { error: "On-hand quantity cannot be negative" };
    }
    const target = Math.round(nextStock * 1000) / 1000;
    if (Math.abs(before - target) > 0.0005) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let txnType: "IN" | "OUT" | "ADJUSTMENT" = "ADJUSTMENT";
      let txnQty = target;
      let txnNotes = "Set on-hand from product edit";
      if (qtyMode === "add" || qtyMode === "add_bottles") {
        txnType = "IN";
        txnQty = Math.round((target - before) * 1000) / 1000;
        txnNotes =
          qtyMode === "add_bottles"
            ? "Added bottles from product edit"
            : "Added quantity from product edit";
      } else if (target === 0) {
        if (before > 0) {
          txnType = "OUT";
          txnQty = before;
          txnNotes = "Set on-hand to 0 from product edit";
        } else {
          txnQty = 0;
        }
      }
      if (txnQty > 0) {
        const { error: invErr } = await admin.from("inventory_transactions").insert({
          organization_id: org.organizationId,
          product_id: id,
          type: txnType,
          quantity: txnQty,
          notes: txnNotes,
          created_by: user?.id ?? null,
          reference_type: "manual",
        });
        if (invErr) {
          return {
            error: `Product saved but stock update failed: ${invErr.message}`,
          };
        }
        const { data: afterRow } = await admin
          .from("products")
          .select("stock_quantity")
          .eq("id", id)
          .maybeSingle();
        let afterQty = Number(afterRow?.stock_quantity);
        if (!Number.isFinite(afterQty) || Math.abs(afterQty - target) > 0.0005) {
          const { data: forced, error: stockErr } = await admin
            .from("products")
            .update({
              stock_quantity: target,
              updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .eq("organization_id", org.organizationId)
            .is("deleted_at", null)
            .select("stock_quantity")
            .maybeSingle();
          if (stockErr || !forced) {
            return {
              error: `Product saved but stock quantity did not update: ${
                stockErr?.message ?? "no product row updated"
              }`,
            };
          }
          afterQty = Number(forced.stock_quantity);
        }
        if (!Number.isFinite(afterQty) || Math.abs(afterQty - target) > 0.0005) {
          return {
            error: `Product saved but stock still wrong (have ${afterQty}, expected ${target}).`,
          };
        }
      }
    }
  }

  revalidateProducts(id);
  revalidatePath("/services");
  return { success: true };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const org = await requireAction("products.delete");
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
  revalidateProducts();
  revalidatePath("/services");
  return { success: true };
}

export async function adjustInventory(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  let org;
  try {
    org = await requireAction("products.edit");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Insufficient permissions";
    return {
      error:
        msg === "Insufficient permissions"
          ? "You don’t have permission to update inventory. Ask an admin for products.edit."
          : msg,
    };
  }

  const productId = String(formData.get("product_id") ?? "").trim();
  const type = formData.get("type") as "IN" | "OUT" | "ADJUSTMENT";
  const quantity = Number(formData.get("quantity"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!productId || !["IN", "OUT", "ADJUSTMENT"].includes(type)) {
    return { error: "Choose a product and adjustment type" };
  }
  if (!Number.isFinite(quantity)) {
    return { error: "Enter a valid quantity" };
  }
  // IN/OUT require > 0. ADJUSTMENT is absolute on-hand and may be 0.
  if (type !== "ADJUSTMENT" && quantity <= 0) {
    return { error: "Quantity must be greater than zero" };
  }
  if (type === "ADJUSTMENT" && quantity < 0) {
    return { error: "On-hand quantity cannot be negative" };
  }

  // Service role after permission check — user RLS can silently no-op stock updates.
  const { createAdminClient } = await import("@/lib/supabase/admin");
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error:
        "Server is missing SUPABASE_SERVICE_ROLE_KEY — cannot update inventory right now.",
    };
  }

  const { data: product } = await admin
    .from("products")
    .select("id, name, stock_quantity")
    .eq("id", productId)
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!product) return { error: "Product not found in this salon" };

  if (type === "OUT" && Number(product.stock_quantity) < quantity) {
    return {
      error: `Insufficient stock for ${product.name} (have ${product.stock_quantity}, need ${quantity})`,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // DB CHECK quantity > 0 — zeroing stock must OUT the current on-hand amount.
  let txnType: "IN" | "OUT" | "ADJUSTMENT" = type;
  let txnQty = quantity;
  let txnNotes = notes;
  if (type === "ADJUSTMENT" && quantity === 0) {
    const current = Number(product.stock_quantity) || 0;
    if (current <= 0) {
      revalidateProducts(productId);
      return { success: true };
    }
    txnType = "OUT";
    txnQty = current;
    txnNotes = notes ? `${notes} (set on-hand to 0)` : "Set on-hand to 0";
  }

  const beforeQty = Number(product.stock_quantity) || 0;
  const expectedQty =
    txnType === "IN"
      ? Math.round((beforeQty + txnQty) * 1000) / 1000
      : txnType === "OUT"
        ? Math.round((beforeQty - txnQty) * 1000) / 1000
        : Math.round(txnQty * 1000) / 1000;

  const { error } = await admin.from("inventory_transactions").insert({
    organization_id: org.organizationId,
    product_id: productId,
    type: txnType,
    quantity: txnQty,
    notes: txnNotes,
    created_by: user?.id ?? null,
    reference_type: "manual",
  });
  if (error) {
    const msg = error.message || "Inventory update failed";
    if (/insufficient stock/i.test(msg)) {
      return { error: msg };
    }
    return { error: msg };
  }

  // Always confirm on-hand. Trigger usually applies; if not, set explicitly.
  const { data: afterRow } = await admin
    .from("products")
    .select("stock_quantity")
    .eq("id", productId)
    .eq("organization_id", org.organizationId)
    .maybeSingle();
  let afterQty = Number(afterRow?.stock_quantity);
  if (!Number.isFinite(afterQty) || Math.abs(afterQty - expectedQty) > 0.0005) {
    const { data: forced, error: stockErr } = await admin
      .from("products")
      .update({
        stock_quantity: expectedQty,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId)
      .eq("organization_id", org.organizationId)
      .is("deleted_at", null)
      .select("stock_quantity")
      .maybeSingle();
    if (stockErr || !forced) {
      return {
        error: `Movement recorded but stock quantity did not update: ${
          stockErr?.message ?? "no product row updated"
        }`,
      };
    }
    afterQty = Number(forced.stock_quantity);
  }

  if (!Number.isFinite(afterQty) || Math.abs(afterQty - expectedQty) > 0.0005) {
    return {
      error: `Stock still wrong after update (have ${afterQty}, expected ${expectedQty}).`,
    };
  }

  revalidateProducts(productId);
  return {
    success: true,
    message: `${product.name}: on-hand is now ${expectedQty}`,
  };
}

const PRODUCT_LIST_COLUMNS =
  "id, organization_id, category_id, name, sku, description, cost_price, retail_price, stock_quantity, low_stock_threshold, unit_label, pack_size, default_usage_qty, product_kind, is_active, created_at, updated_at, deleted_at, category:product_categories(id, name)";

export async function getProductCategories() {
  const org = await requireOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_categories")
    .select(
      "id, organization_id, name, sort_order, deleted_at, deleted_by, deleted_by_role, created_by, updated_by, created_at, updated_at"
    )
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
    .select(PRODUCT_LIST_COLUMNS)
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .order("name")
    .limit(1000);
  if (error) throw new Error(error.message);
  return data as unknown as (Product & { category: { id: string; name: string } | null })[];
}

/** Customer catalog (POS sellables). Pure in-house stock is managed under /in-house. */
export async function getRetailProducts() {
  const org = await requireOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_LIST_COLUMNS)
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .eq("is_active", true)
    .in("product_kind", ["RETAIL", "BOTH"])
    .order("name")
    .limit(1000);
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
  const { data, error } = await supabase.rpc("low_stock_products", {
    p_organization_id: org.organizationId,
    p_limit: 100,
  });
  if (error) {
    console.error("[inventory] low-stock query failed", error.message);
    return [];
  }
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    stock: p.stock_quantity,
    threshold: p.low_stock_threshold,
  }));
}

export async function getPosCatalog() {
  const org = await requireOrganization();
  const supabase = await createClient();

  // Cap catalog payloads; customers are recent-only — search via searchPosCustomers.
  const [services, products, packages, customers, staff] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, price, duration_minutes")
      .eq("organization_id", org.organizationId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("name")
      .limit(500),
    supabase
      .from("products")
      .select("id, name, retail_price, stock_quantity, product_kind")
      .eq("organization_id", org.organizationId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .in("product_kind", ["RETAIL", "BOTH"])
      .order("name")
      .limit(500),
    supabase
      .from("packages")
      .select("id, name, price")
      .eq("organization_id", org.organizationId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("name")
      .limit(200),
    supabase
      .from("customers")
      .select("id, first_name, last_name, phone")
      .eq("organization_id", org.organizationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("staff")
      .select("id, full_name")
      .eq("organization_id", org.organizationId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("full_name")
      .limit(100),
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

type PosCustomerOption = {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
};

/** POS customer typeahead — lean columns, capped results. */
export async function searchPosCustomers(search: string): Promise<PosCustomerOption[]> {
  const org = await requireOrganization();
  const q = search.trim();
  if (q.length < 1) return [];

  const supabase = await createClient();
  const {
    normalizeBookingPhone,
    phoneLookupVariants,
  } = await import("@/lib/customers/ensure-from-booking");

  const safe = q.replace(/[%_]/g, " ").replace(/\s+/g, " ").trim();
  if (!safe) return [];

  const words = safe.split(" ").filter((w) => w.length > 0);
  const byId = new Map<string, PosCustomerOption>();

  const merge = (rows: PosCustomerOption[] | null | undefined) => {
    for (const row of rows ?? []) byId.set(row.id, row);
  };

  const base = () =>
    supabase
      .from("customers")
      .select("id, first_name, last_name, phone")
      .eq("organization_id", org.organizationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(25);

  // Prefer column filters over `.or()` — more reliable with spaces / phones.
  const searches = [
    base().ilike("first_name", `%${safe}%`),
    base().ilike("last_name", `%${safe}%`),
    base().ilike("phone", `%${safe}%`),
  ];

  // "Murad Ali" → first_name ~ Murad AND last_name ~ Ali
  if (words.length >= 2) {
    const first = words[0];
    const last = words.slice(1).join(" ");
    searches.push(
      base().ilike("first_name", `%${first}%`).ilike("last_name", `%${last}%`)
    );
  }

  const normalized = normalizeBookingPhone(q);
  if (normalized) {
    for (const variant of phoneLookupVariants(normalized)) {
      if (!variant) continue;
      searches.push(base().eq("phone", variant));
      searches.push(base().ilike("phone", `%${variant}%`));
    }
  }

  const results = await Promise.all(searches);
  for (const res of results) {
    if (!("error" in res) || !res.error) {
      merge((res.data ?? null) as PosCustomerOption[] | null);
    }
  }

  return [...byId.values()].slice(0, 25);
}

/** Lean customer row for POS picker after inline create. */
export async function getPosCustomerOption(customerId: string) {
  const org = await requireOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, first_name, last_name, phone")
    .eq("id", customerId)
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
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
    .select(PRODUCT_LIST_COLUMNS)
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .eq("is_active", true)
    .in("product_kind", ["IN_HOUSE", "BOTH"])
    .order("name")
    .limit(1000);
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
    .select(PRODUCT_LIST_COLUMNS)
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
  const org = await requireAction("pos.sell");
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
