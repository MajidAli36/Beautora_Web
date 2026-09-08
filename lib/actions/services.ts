"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMinimumRole } from "@/lib/auth/permissions";
import { requireOrganization } from "@/lib/auth/organization";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/customers";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  sort_order: z.coerce.number().int().min(0).default(0),
});

const serviceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category_id: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be positive"),
  duration_minutes: z.coerce.number().int().min(1, "Duration must be at least 1 minute"),
  is_active: z.coerce.boolean().default(true),
});

const packageSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  is_active: z.coerce.boolean().default(true),
});

export async function createCategory(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const org = await requireMinimumRole("MANAGER");
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    sort_order: formData.get("sort_order") || 0,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("service_categories").insert({
    organization_id: org.organizationId,
    name: parsed.data.name,
    sort_order: parsed.data.sort_order,
  });

  if (error) return { error: error.message };
  revalidatePath("/services");
  revalidatePath("/");
  revalidatePath("/book");
  return { success: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const org = await requireMinimumRole("MANAGER");
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("service_categories")
    .select("id, name")
    .eq("id", id)
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!row) return { error: "Category not found" };

  const { resolveSoftDeleteActor, softDeleteEntity } = await import("@/lib/db/soft-delete");
  const actor = await resolveSoftDeleteActor();
  const result = await softDeleteEntity({
    table: "service_categories",
    id,
    organizationId: org.organizationId,
    actor,
    action: "service_category.delete",
    entityType: "service_category",
    summary: `Deleted service category ${row.name}`,
    before: row as unknown as Record<string, unknown>,
  });
  if (result.error) return { error: result.error };
  revalidatePath("/services");
  revalidatePath("/");
  revalidatePath("/book");
  return { success: true };
}

export async function createService(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const org = await requireMinimumRole("MANAGER");
  const categoryId = formData.get("category_id") as string;

  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    category_id: categoryId && categoryId !== "none" ? categoryId : undefined,
    price: formData.get("price"),
    duration_minutes: formData.get("duration_minutes"),
    is_active: formData.get("is_active") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("services")
    .insert({
      organization_id: org.organizationId,
      category_id: parsed.data.category_id ?? null,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      price: parsed.data.price,
      duration_minutes: parsed.data.duration_minutes,
      is_active: parsed.data.is_active,
    })
    .select("id")
    .single();

  if (error || !created) return { error: error?.message ?? "Failed to create service" };

  revalidatePath("/services");
  revalidatePath("/");
  revalidatePath("/book");
  return { success: true };
}

export async function updateService(
  id: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const org = await requireMinimumRole("MANAGER");
  const categoryId = formData.get("category_id") as string;

  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    category_id: categoryId && categoryId !== "none" ? categoryId : undefined,
    price: formData.get("price"),
    duration_minutes: formData.get("duration_minutes"),
    is_active: formData.get("is_active") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update({
      category_id: parsed.data.category_id ?? null,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      price: parsed.data.price,
      duration_minutes: parsed.data.duration_minutes,
      is_active: parsed.data.is_active,
    })
    .eq("id", id)
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null);

  if (error) return { error: error.message };

  revalidatePath("/services");
  revalidatePath("/");
  revalidatePath("/book");
  return { success: true };
}

/** Link / update in-house products used when this service is sold at POS. */
export async function updateServiceUsageRecipe(
  serviceId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const org = await requireMinimumRole("MANAGER");
  const supabase = await createClient();
  const { data: svc } = await supabase
    .from("services")
    .select("id")
    .eq("id", serviceId)
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!svc) return { error: "Service not found" };

  const usage = parseUsageRecipeFromForm(formData);
  const usageResult = await replaceServiceUsageRecipe(org.organizationId, serviceId, usage);
  if (usageResult.error) return { error: usageResult.error };

  revalidatePath("/services");
  revalidatePath("/in-house");
  revalidatePath("/");
  return { success: true };
}

/** From In-house listing: attach this product to a service recipe (upsert). */
export async function linkInHouseProductToService(
  productId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const org = await requireMinimumRole("MANAGER");
  const serviceId = String(formData.get("service_id") ?? "").trim();
  if (!serviceId) return { error: "Choose a service" };

  const supabase = await createClient();
  const [{ data: product }, { data: service }] = await Promise.all([
    supabase
      .from("products")
      .select("id, product_kind, is_active, deleted_at, default_usage_qty")
      .eq("id", productId)
      .eq("organization_id", org.organizationId)
      .maybeSingle(),
    supabase
      .from("services")
      .select("id")
      .eq("id", serviceId)
      .eq("organization_id", org.organizationId)
      .is("deleted_at", null)
      .maybeSingle(),
  ]);

  if (!product || product.deleted_at || !product.is_active) {
    return { error: "In-house product not found or inactive" };
  }
  if (product.product_kind !== "IN_HOUSE" && product.product_kind !== "BOTH") {
    return { error: "Only in-house products can be linked to services" };
  }
  if (!service) return { error: "Service not found" };

  const quantity = Number(product.default_usage_qty);
  if (!(quantity > 0)) {
    return { error: "Set use per client on the product (Edit) before linking" };
  }

  const { data: existing } = await supabase
    .from("service_product_usage")
    .select("id")
    .eq("organization_id", org.organizationId)
    .eq("service_id", serviceId)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("service_product_usage")
      .update({ quantity_per_service: quantity })
      .eq("id", existing.id)
      .eq("organization_id", org.organizationId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("service_product_usage").insert({
      organization_id: org.organizationId,
      service_id: serviceId,
      product_id: productId,
      quantity_per_service: quantity,
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/services");
  revalidatePath("/in-house");
  return { success: true };
}

export async function getActiveServicesForLinking() {
  const org = await requireOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("id, name, is_active")
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Map product_id → list of linked service names (for in-house table). */
export async function getServiceLinksByProduct() {
  const org = await requireOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_product_usage")
    .select("product_id, quantity_per_service, service:services(id, name, deleted_at)")
    .eq("organization_id", org.organizationId);
  if (error) throw new Error(error.message);

  const map = new Map<
    string,
    { serviceId: string; serviceName: string; quantity: number }[]
  >();
  for (const row of data ?? []) {
    const service = row.service as { id: string; name: string; deleted_at: string | null } | null;
    if (!service || service.deleted_at) continue;
    const list = map.get(row.product_id) ?? [];
    list.push({
      serviceId: service.id,
      serviceName: service.name,
      quantity: Number(row.quantity_per_service),
    });
    map.set(row.product_id, list);
  }
  return map;
}

function parseUsageRecipeFromForm(formData: FormData): {
  productId: string;
  quantity: number;
}[] {
  const productIds = formData.getAll("usage_product_id").map(String);
  const quantities = formData.getAll("usage_qty").map(String);
  const rows: { productId: string; quantity: number }[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < productIds.length; i++) {
    const productId = productIds[i]?.trim();
    if (!productId || productId === "none") continue;
    const quantity = Number(quantities[i] ?? 0);
    if (!(quantity > 0)) continue;
    if (seen.has(productId)) continue;
    seen.add(productId);
    rows.push({ productId, quantity });
  }
  return rows;
}

async function replaceServiceUsageRecipe(
  organizationId: string,
  serviceId: string,
  rows: { productId: string; quantity: number }[]
): Promise<{ error?: string }> {
  const supabase = await createClient();

  if (rows.length) {
    const ids = rows.map((r) => r.productId);
    const { data: products, error } = await supabase
      .from("products")
      .select("id, product_kind, is_active, deleted_at")
      .eq("organization_id", organizationId)
      .in("id", ids);
    if (error) return { error: error.message };
    if ((products ?? []).length !== ids.length) {
      return { error: "One or more in-house products were not found" };
    }
    for (const p of products ?? []) {
      if (!p.is_active || p.deleted_at) {
        return { error: "In-house products must be active" };
      }
      if (p.product_kind !== "IN_HOUSE" && p.product_kind !== "BOTH") {
        return { error: "Only in-house (or both) products can be used in a service recipe" };
      }
    }
  }

  const { error: delErr } = await supabase
    .from("service_product_usage")
    .delete()
    .eq("organization_id", organizationId)
    .eq("service_id", serviceId);
  if (delErr) return { error: delErr.message };

  if (!rows.length) return {};

  const { error: insErr } = await supabase.from("service_product_usage").insert(
    rows.map((r) => ({
      organization_id: organizationId,
      service_id: serviceId,
      product_id: r.productId,
      quantity_per_service: r.quantity,
    }))
  );
  if (insErr) return { error: insErr.message };
  return {};
}

export async function getServiceUsageRecipe(serviceId: string) {
  const org = await requireOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_product_usage")
    .select(
      "id, product_id, quantity_per_service, product:products(id, name, cost_price, stock_quantity, product_kind, sku)"
    )
    .eq("organization_id", org.organizationId)
    .eq("service_id", serviceId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as {
    id: string;
    product_id: string;
    quantity_per_service: number;
    product: {
      id: string;
      name: string;
      cost_price: number;
      stock_quantity: number;
      product_kind: string;
      sku: string | null;
    } | null;
  }[];
}

export async function getServicesWithUsage() {
  const org = await requireOrganization();
  const supabase = await createClient();

  const [{ data: services, error }, { data: usageRows, error: usageErr }] = await Promise.all([
    supabase
      .from("services")
      .select("*, category:service_categories(id, name)")
      .eq("organization_id", org.organizationId)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("service_product_usage")
      .select("id, service_id, product_id, quantity_per_service")
      .eq("organization_id", org.organizationId),
  ]);

  if (error) throw new Error(error.message);
  if (usageErr) throw new Error(usageErr.message);

  const usageByService = new Map<
    string,
    { id: string; product_id: string; quantity_per_service: number }[]
  >();
  for (const row of usageRows ?? []) {
    const list = usageByService.get(row.service_id) ?? [];
    list.push({
      id: row.id,
      product_id: row.product_id,
      quantity_per_service: Number(row.quantity_per_service),
    });
    usageByService.set(row.service_id, list);
  }

  return (services ?? []).map((s) => ({
    ...s,
    usage: usageByService.get(s.id) ?? [],
  }));
}

export async function deleteService(id: string): Promise<ActionResult> {
  const org = await requireMinimumRole("MANAGER");
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("services")
    .select("id, name, price")
    .eq("id", id)
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!row) return { error: "Service not found" };

  const { resolveSoftDeleteActor, softDeleteEntity } = await import("@/lib/db/soft-delete");
  const actor = await resolveSoftDeleteActor();
  const result = await softDeleteEntity({
    table: "services",
    id,
    organizationId: org.organizationId,
    actor,
    action: "service.delete",
    entityType: "service",
    summary: `Deleted service ${row.name}`,
    before: row as unknown as Record<string, unknown>,
    extraPatch: { is_active: false },
  });
  if (result.error) return { error: result.error };
  revalidatePath("/services");
  revalidatePath("/");
  revalidatePath("/book");
  return { success: true };
}

export async function createPackage(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const org = await requireMinimumRole("MANAGER");
  const parsed = packageSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
    is_active: formData.get("is_active") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const serviceIds = formData.getAll("service_ids") as string[];
  const quantities = formData.getAll("quantities") as string[];

  const supabase = await createClient();
  const { data: pkg, error: pkgError } = await supabase
    .from("packages")
    .insert({
      organization_id: org.organizationId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      price: parsed.data.price,
      is_active: parsed.data.is_active,
    })
    .select("id")
    .single();

  if (pkgError || !pkg) return { error: pkgError?.message ?? "Failed to create package" };

  const items = serviceIds
    .map((serviceId, i) => ({
      organization_id: org.organizationId,
      package_id: pkg.id,
      service_id: serviceId,
      quantity: parseInt(quantities[i] ?? "0", 10) || 0,
      sort_order: i,
    }))
    .filter((item) => item.quantity > 0);

  if (items.length > 0) {
    const { error: itemsError } = await supabase.from("package_items").insert(items);
    if (itemsError) return { error: itemsError.message };
  }

  revalidatePath("/services");
  revalidatePath("/");
  revalidatePath("/book");
  return { success: true };
}

export async function deletePackage(id: string): Promise<ActionResult> {
  const org = await requireMinimumRole("MANAGER");
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("packages")
    .select("id, name, price")
    .eq("id", id)
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!row) return { error: "Package not found" };

  const { resolveSoftDeleteActor, softDeleteEntity } = await import("@/lib/db/soft-delete");
  const actor = await resolveSoftDeleteActor();
  const result = await softDeleteEntity({
    table: "packages",
    id,
    organizationId: org.organizationId,
    actor,
    action: "package.delete",
    entityType: "package",
    summary: `Deleted package ${row.name}`,
    before: row as unknown as Record<string, unknown>,
    extraPatch: { is_active: false },
  });
  if (result.error) return { error: result.error };
  revalidatePath("/services");
  revalidatePath("/");
  revalidatePath("/book");
  return { success: true };
}

export async function getServiceCategories() {
  const org = await requireOrganization();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("service_categories")
    .select("*")
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .order("sort_order")
    .order("name");

  if (error) throw new Error(error.message);
  return data;
}

export async function getServices() {
  const org = await requireOrganization();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("services")
    .select("*, category:service_categories(id, name)")
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .order("name");

  if (error) throw new Error(error.message);
  return data;
}

export async function getPackages() {
  const org = await requireOrganization();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("packages")
    .select(`
      *,
      items:package_items (
        id,
        quantity,
        sort_order,
        service:services (id, name, price, duration_minutes)
      )
    `)
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .order("name");

  if (error) throw new Error(error.message);
  return data;
}
