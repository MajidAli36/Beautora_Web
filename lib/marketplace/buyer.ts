"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/session";
import { getActiveOrganization } from "@/lib/auth/organization";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, tryCreateAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types/commerce";
import type { Database } from "@/types/database.types";

type AddressRow = Database["public"]["Tables"]["marketplace_addresses"]["Row"];
type WishlistRow = Database["public"]["Tables"]["marketplace_wishlists"]["Row"];

export async function listMyAddresses(): Promise<AddressRow[]> {
  const user = await requireAuth();
  const supabase = await createClient();
  const { data } = await supabase
    .from("marketplace_addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as AddressRow[];
}

export async function upsertMyAddress(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireAuth();
  const id = String(formData.get("id") ?? "").trim() || null;
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const line1 = String(formData.get("line1") ?? "").trim();
  const line2 = String(formData.get("line2") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim();
  const area = String(formData.get("area") ?? "").trim() || null;
  const country = String(formData.get("country") ?? "Pakistan").trim() || "Pakistan";
  const postalCode = String(formData.get("postal_code") ?? "").trim() || null;
  const label = String(formData.get("label") ?? "").trim() || null;
  const isDefault = String(formData.get("is_default") ?? "") === "1";

  if (fullName.length < 2) return { error: "Name is required." };
  if (phone.length < 7) return { error: "Phone is required." };
  if (line1.length < 3) return { error: "Address line is required." };
  if (city.length < 2) return { error: "City is required." };

  const supabase = await createClient();

  if (isDefault) {
    await supabase
      .from("marketplace_addresses")
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("is_default", true);
  }

  const patch = {
    full_name: fullName,
    phone,
    line1,
    line2,
    city,
    area,
    country,
    postal_code: postalCode,
    label,
    is_default: isDefault,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { error } = await supabase
      .from("marketplace_addresses")
      .update(patch)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("marketplace_addresses").insert({
      user_id: user.id,
      ...patch,
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/account");
  revalidatePath("/checkout");
  return { success: true };
}

export async function deleteMyAddress(addressId: string): Promise<ActionResult> {
  const user = await requireAuth();
  const supabase = await createClient();
  const { error } = await supabase
    .from("marketplace_addresses")
    .delete()
    .eq("id", addressId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/account");
  return { success: true };
}

export async function listMyWishlist(): Promise<WishlistRow[]> {
  const user = await requireAuth();
  const supabase = await createClient();
  const { data } = await supabase
    .from("marketplace_wishlists")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (data ?? []) as WishlistRow[];
}

export async function toggleWishlist(input: {
  targetType: "product" | "salon" | "service";
  productId?: string;
  organizationId?: string;
  serviceId?: string;
}): Promise<ActionResult & { wished?: boolean }> {
  const user = await requireAuth();
  const supabase = await createClient();

  let q = supabase
    .from("marketplace_wishlists")
    .select("id")
    .eq("user_id", user.id)
    .eq("target_type", input.targetType);

  if (input.targetType === "product" && input.productId) {
    q = q.eq("product_id", input.productId);
  } else if (input.targetType === "salon" && input.organizationId) {
    q = q.eq("organization_id", input.organizationId);
  } else if (input.targetType === "service" && input.serviceId) {
    q = q.eq("service_id", input.serviceId);
  } else {
    return { error: "Invalid wishlist target." };
  }

  const { data: existing } = await q.maybeSingle();
  if (existing) {
    await supabase.from("marketplace_wishlists").delete().eq("id", existing.id);
    revalidatePath("/account");
    return { success: true, wished: false };
  }

  const { error } = await supabase.from("marketplace_wishlists").insert({
    user_id: user.id,
    target_type: input.targetType,
    product_id: input.targetType === "product" ? input.productId ?? null : null,
    organization_id: input.targetType === "salon" ? input.organizationId ?? null : null,
    service_id: input.targetType === "service" ? input.serviceId ?? null : null,
  });
  if (error) return { error: error.message };
  revalidatePath("/account");
  return { success: true, wished: true };
}

export async function listMyMarketplaceOrders() {
  const user = await requireAuth();
  const supabase = await createClient();
  const { data } = await supabase
    .from("marketplace_orders")
    .select("*, marketplace_order_items(*), marketplace_seller_orders(*)")
    .eq("buyer_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function setOrganizationMarketplaceStore(
  enabled: boolean
): Promise<ActionResult> {
  const user = await requireAuth();
  const org = await getActiveOrganization();
  if (!org?.organizationId) return { error: "No active salon." };
  if (!["OWNER", "ADMIN"].includes(org.role)) {
    return { error: "Only owners/admins can enable the marketplace store." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      marketplace_store_enabled: enabled,
      marketplace_store_published_at: enabled ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", org.organizationId);
  if (error) return { error: error.message };

  void user;
  revalidatePath("/marketplace");
  revalidatePath("/stores");
  return { success: true };
}

export async function getPublicSalonMarketplaceStore(slug: string) {
  const admin = tryCreateAdminClient();
  if (!admin) return null;

  const { data: org } = await admin
    .from("organizations")
    .select("id, name, slug, city, address, phone, email, tagline, logo_path, cover_path, marketplace_store_enabled, public_listing_enabled")
    .eq("slug", slug)
    .maybeSingle();
  if (!org || !org.public_listing_enabled) return null;

  const { data: seller } = await admin
    .from("marketplace_sellers")
    .select("*")
    .eq("organization_id", org.id)
    .eq("status", "approved")
    .maybeSingle();

  // Show marketplace tab when store is enabled OR an approved seller is linked
  if (!org.marketplace_store_enabled && !seller) return null;

  let products: Database["public"]["Tables"]["marketplace_products"]["Row"][] = [];
  if (seller) {
    const { data } = await admin
      .from("marketplace_products")
      .select("*")
      .eq("seller_id", seller.id)
      .eq("status", "published")
      .gt("stock", 0)
      .order("updated_at", { ascending: false })
      .limit(48);
    products = (data ?? []) as typeof products;
  }

  const { data: services } = await admin
    .from("services")
    .select("id, name, duration_minutes, price, description, is_active")
    .eq("organization_id", org.id)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("name")
    .limit(48);

  return {
    organization: org,
    seller,
    products,
    services: services ?? [],
  };
}

export async function getPublicSellerStore(sellerSlug: string) {
  const admin = tryCreateAdminClient();
  if (!admin) return null;
  const { data: seller } = await admin
    .from("marketplace_sellers")
    .select("*")
    .eq("slug", sellerSlug)
    .eq("status", "approved")
    .maybeSingle();
  if (!seller) return null;

  const { data: products } = await admin
    .from("marketplace_products")
    .select("*")
    .eq("seller_id", seller.id)
    .eq("status", "published")
    .gt("stock", 0)
    .order("updated_at", { ascending: false })
    .limit(100);

  return { seller, products: products ?? [] };
}
