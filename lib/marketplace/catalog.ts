"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/marketplace/constants";
import type { ActionResult } from "@/types/commerce";
import type { Database } from "@/types/database.types";

type ProductImage = Database["public"]["Tables"]["marketplace_product_images"]["Row"];
type ProductVariant = Database["public"]["Tables"]["marketplace_product_variants"]["Row"];
type Brand = Database["public"]["Tables"]["marketplace_brands"]["Row"];

async function requireSeller() {
  const { getMyMarketplaceSeller } = await import("@/lib/marketplace/actions");
  return getMyMarketplaceSeller();
}

export async function updateSellerStoreProfile(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const seller = await requireSeller();
  if (!seller) return { error: "Not a seller." };

  const shopName = String(formData.get("shop_name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim() || null;
  const deliveryNotes = String(formData.get("delivery_notes") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const country = String(formData.get("country") ?? "").trim() || null;
  const logoUrl = String(formData.get("logo_url") ?? "").trim() || null;
  const coverUrl = String(formData.get("cover_url") ?? "").trim() || null;
  const accountEmail = String(formData.get("account_email") ?? "").trim() || null;
  const invoiceEmail = String(formData.get("invoice_email") ?? "").trim() || null;
  const acceptsCod = String(formData.get("accepts_cod") ?? "") === "1";
  const acceptsCard = String(formData.get("accepts_card") ?? "") === "1";
  const supportsCod = acceptsCod;
  const publish = String(formData.get("publish") ?? "") === "1";
  const codTerms = String(formData.get("cod_terms") ?? "").trim() || null;
  const codPrepNote = String(formData.get("cod_prep_note") ?? "").trim() || null;
  const cardInstructions = String(formData.get("card_instructions") ?? "").trim() || null;
  const cardAccountTitle = String(formData.get("card_account_title") ?? "").trim() || null;
  const cardAccountNumber = String(formData.get("card_account_number") ?? "").trim() || null;
  const cardBankName = String(formData.get("card_bank_name") ?? "").trim() || null;
  const cardNetworks = String(formData.get("card_networks") ?? "").trim() || null;

  if (shopName.length < 2) return { error: "Shop name is required." };
  if (!acceptsCod && !acceptsCard) {
    return { error: "Enable at least one payment method (COD or card)." };
  }
  if (acceptsCard && !cardAccountNumber && !cardInstructions) {
    return {
      error: "Add card account number or payment instructions before enabling card payments.",
    };
  }

  const { requireContactPhone } = await import("@/lib/phone/contact");
  const phoneRaw = formData.get("phone");
  let phone: string | null = seller.phone;
  if (phoneRaw != null && String(phoneRaw).trim()) {
    const phoneResult = requireContactPhone(String(phoneRaw));
    if (!phoneResult.ok) return { error: phoneResult.error };
    phone = phoneResult.phone;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("marketplace_sellers")
    .update({
      shop_name: shopName,
      bio,
      phone,
      delivery_notes: deliveryNotes,
      city,
      country,
      logo_url: logoUrl,
      cover_url: coverUrl,
      supports_cod: supportsCod,
      accepts_cod: acceptsCod,
      accepts_card: acceptsCard,
      account_email: accountEmail,
      invoice_email: invoiceEmail,
      cod_terms: codTerms,
      cod_prep_note: codPrepNote,
      card_instructions: cardInstructions,
      card_account_title: cardAccountTitle,
      card_account_number: cardAccountNumber,
      card_bank_name: cardBankName,
      card_networks: cardNetworks,
      store_published_at: publish
        ? seller.store_published_at ?? new Date().toISOString()
        : seller.store_published_at,
      updated_at: new Date().toISOString(),
    })
    .eq("id", seller.id);
  if (error) {
    // Migration may not be applied yet — retry without payment-term columns
    if (
      error.message.includes("cod_terms") ||
      error.message.includes("card_account") ||
      error.message.includes("card_instructions")
    ) {
      const { error: fbErr } = await supabase
        .from("marketplace_sellers")
        .update({
          shop_name: shopName,
          bio,
          phone,
          delivery_notes: deliveryNotes,
          city,
          country,
          logo_url: logoUrl,
          cover_url: coverUrl,
          supports_cod: supportsCod,
          accepts_cod: acceptsCod,
          accepts_card: acceptsCard,
          account_email: accountEmail,
          invoice_email: invoiceEmail,
          store_published_at: publish
            ? seller.store_published_at ?? new Date().toISOString()
            : seller.store_published_at,
          updated_at: new Date().toISOString(),
        })
        .eq("id", seller.id);
      if (fbErr) return { error: fbErr.message };
    } else {
      return { error: error.message };
    }
  }

  revalidatePath("/marketplace");
  revalidatePath("/marketplace/settings");
  revalidatePath("/shop");
  return { success: true };
}

export async function listActiveBrands(): Promise<Brand[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("marketplace_brands")
    .select("*")
    .eq("is_active", true)
    .order("name");
  return (data ?? []) as Brand[];
}

export async function ensureBrand(name: string): Promise<ActionResult & { brandId?: string }> {
  const seller = await requireSeller();
  if (!seller) return { error: "Not a seller." };
  const trimmed = name.trim();
  if (trimmed.length < 2) return { error: "Brand name required." };

  const slug = slugify(trimmed);
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("marketplace_brands")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) return { success: true, brandId: existing.id };

  const { data, error } = await admin
    .from("marketplace_brands")
    .insert({ name: trimmed, slug, is_active: true })
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { success: true, brandId: data.id };
}

export async function listProductImages(productId: string): Promise<ProductImage[]> {
  const seller = await requireSeller();
  if (!seller) return [];
  const supabase = await createClient();
  const { data: owned } = await supabase
    .from("marketplace_products")
    .select("id")
    .eq("id", productId)
    .eq("seller_id", seller.id)
    .maybeSingle();
  if (!owned) return [];

  const { data } = await supabase
    .from("marketplace_product_images")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order");
  return (data ?? []) as ProductImage[];
}

export async function addProductImage(formData: FormData): Promise<ActionResult> {
  const seller = await requireSeller();
  if (!seller) return { error: "Not a seller." };
  const productId = String(formData.get("product_id") ?? "");
  const url = String(formData.get("url") ?? "").trim();
  const altText = String(formData.get("alt_text") ?? "").trim() || null;
  const sortOrder = Math.max(0, Math.floor(Number(formData.get("sort_order") ?? 0)));
  if (!url) return { error: "Image URL required." };

  const supabase = await createClient();
  const { data: owned } = await supabase
    .from("marketplace_products")
    .select("id")
    .eq("id", productId)
    .eq("seller_id", seller.id)
    .maybeSingle();
  if (!owned) return { error: "Product not found." };

  const { error } = await supabase.from("marketplace_product_images").insert({
    product_id: productId,
    url,
    alt_text: altText,
    sort_order: sortOrder,
  });
  if (error) return { error: error.message };
  revalidatePath("/marketplace/products");
  return { success: true };
}

export async function deleteProductImage(imageId: string): Promise<ActionResult> {
  const seller = await requireSeller();
  if (!seller) return { error: "Not a seller." };
  const supabase = await createClient();
  const { data: img } = await supabase
    .from("marketplace_product_images")
    .select("id, product_id, marketplace_products!inner(seller_id)")
    .eq("id", imageId)
    .maybeSingle();
  const row = img as unknown as {
    id: string;
    marketplace_products: { seller_id: string };
  } | null;
  if (!row || row.marketplace_products.seller_id !== seller.id) {
    return { error: "Image not found." };
  }
  const { error } = await supabase.from("marketplace_product_images").delete().eq("id", imageId);
  if (error) return { error: error.message };
  revalidatePath("/marketplace/products");
  return { success: true };
}

export async function listProductVariants(productId: string): Promise<ProductVariant[]> {
  const seller = await requireSeller();
  if (!seller) return [];
  const supabase = await createClient();
  const { data: owned } = await supabase
    .from("marketplace_products")
    .select("id")
    .eq("id", productId)
    .eq("seller_id", seller.id)
    .maybeSingle();
  if (!owned) return [];

  const { data } = await supabase
    .from("marketplace_product_variants")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order");
  return (data ?? []) as ProductVariant[];
}

export async function upsertProductVariant(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const seller = await requireSeller();
  if (!seller) return { error: "Not a seller." };

  const id = String(formData.get("id") ?? "").trim() || null;
  const productId = String(formData.get("product_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  const salePriceRaw = String(formData.get("sale_price") ?? "").trim();
  const salePrice = salePriceRaw ? Number(salePriceRaw) : null;
  const stock = Math.max(0, Math.floor(Number(formData.get("stock") ?? 0)));
  const sku = String(formData.get("sku") ?? "").trim() || null;
  const barcode = String(formData.get("barcode") ?? "").trim() || null;
  const imageUrl = String(formData.get("image_url") ?? "").trim() || null;
  const sortOrder = Math.max(0, Math.floor(Number(formData.get("sort_order") ?? 0)));
  const isActive = String(formData.get("is_active") ?? "1") !== "0";

  if (name.length < 1) return { error: "Variant name required." };
  if (!(price >= 0)) return { error: "Invalid price." };

  const supabase = await createClient();
  const { data: owned } = await supabase
    .from("marketplace_products")
    .select("id")
    .eq("id", productId)
    .eq("seller_id", seller.id)
    .maybeSingle();
  if (!owned) return { error: "Product not found." };

  if (id) {
    const { error } = await supabase
      .from("marketplace_product_variants")
      .update({
        name,
        price,
        sale_price: salePrice,
        stock,
        sku,
        barcode,
        image_url: imageUrl,
        sort_order: sortOrder,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("product_id", productId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("marketplace_product_variants").insert({
      product_id: productId,
      name,
      price,
      sale_price: salePrice,
      stock,
      sku,
      barcode,
      image_url: imageUrl,
      sort_order: sortOrder,
      is_active: isActive,
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/marketplace/products");
  return { success: true };
}

export async function deleteProductVariant(variantId: string): Promise<ActionResult> {
  const seller = await requireSeller();
  if (!seller) return { error: "Not a seller." };
  const supabase = await createClient();
  const { data: v } = await supabase
    .from("marketplace_product_variants")
    .select("id, product_id, marketplace_products!inner(seller_id)")
    .eq("id", variantId)
    .maybeSingle();
  const row = v as unknown as {
    id: string;
    marketplace_products: { seller_id: string };
  } | null;
  if (!row || row.marketplace_products.seller_id !== seller.id) {
    return { error: "Variant not found." };
  }
  const { error } = await supabase
    .from("marketplace_product_variants")
    .delete()
    .eq("id", variantId);
  if (error) return { error: error.message };
  revalidatePath("/marketplace/products");
  return { success: true };
}

export async function getProductCatalogDetail(productId: string) {
  const { tryCreateAdminClient } = await import("@/lib/supabase/admin");
  const admin = tryCreateAdminClient();
  if (!admin) return null;
  const { data: product } = await admin
    .from("marketplace_products")
    .select(
      "*, marketplace_sellers!inner(shop_name, slug, status, logo_url, city, country), marketplace_categories(name, slug)"
    )
    .eq("id", productId)
    .eq("status", "published")
    .eq("marketplace_sellers.status", "approved")
    .maybeSingle();
  if (!product) return null;

  const imagesRes = await admin
    .from("marketplace_product_images")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order");
  const variantsRes = await admin
    .from("marketplace_product_variants")
    .select("*")
    .eq("product_id", productId)
    .eq("is_active", true)
    .order("sort_order");
  const { data: reviews } = await admin
    .from("marketplace_reviews")
    .select("*")
    .eq("product_id", productId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(30);

  let brand: { name: string; slug: string } | null = null;
  const brandId = (product as { brand_id?: string | null }).brand_id;
  if (brandId) {
    const { data } = await admin
      .from("marketplace_brands")
      .select("name, slug")
      .eq("id", brandId)
      .maybeSingle();
    brand = data;
  }

  return {
    product: {
      ...product,
      marketplace_brands: brand,
    },
    images: imagesRes.error ? [] : imagesRes.data ?? [],
    variants: variantsRes.error ? [] : variantsRes.data ?? [],
    reviews: reviews ?? [],
  };
}
