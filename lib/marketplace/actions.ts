"use server";

import { cache } from "react";
import { revalidatePath, unstable_cache, updateTag } from "next/cache";
import { cookies } from "next/headers";
import { requireAuth } from "@/lib/auth/session";
import { isCustomerAccount } from "@/lib/auth/account-types";
import { getActiveOrganization } from "@/lib/auth/organization";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, tryCreateAdminClient } from "@/lib/supabase/admin";
import {
  APP_MODE_COOKIE,
  slugify,
  type AppMode,
  type MarketplaceOrderStatus,
} from "@/lib/marketplace/constants";
import { resolveCommissionRate } from "@/lib/marketplace/commission";
import type { ActionResult } from "@/types/commerce";
import type { Database } from "@/types/database.types";

type SellerRow = Database["public"]["Tables"]["marketplace_sellers"]["Row"];
type ProductRow = Database["public"]["Tables"]["marketplace_products"]["Row"];
type CategoryRow = Database["public"]["Tables"]["marketplace_categories"]["Row"];

/** Cookie read once per request when layout + pages both ask. */
export const getAppMode = cache(async (): Promise<AppMode> => {
  const jar = await cookies();
  const v = jar.get(APP_MODE_COOKIE)?.value;
  if (v === "marketplace") return "marketplace";
  if (v === "customer_app") return "customer_app";
  return "saas";
});

export async function setAppMode(mode: AppMode): Promise<ActionResult & { mode?: AppMode }> {
  const user = await requireAuth();

  if (mode === "customer_app") {
    const org = await getActiveOrganization();
    if (!org) return { error: "No salon workspace." };
    const { getCustomerAppByOrg } = await import("@/lib/customer-apps/service");
    const app = await getCustomerAppByOrg(org.organizationId);
    if (!app || app.status === "deactivated") {
      return {
        error:
          "App dashboard is not enabled for this salon. Ask Beautora Super Admin to enable Customer apps.",
      };
    }
    if (app.status === "suspended") {
      return { error: "Customer app is suspended. Contact Super Admin." };
    }
  } else {
    const { parseProductIntent, productIntentAllowsMode } = await import(
      "@/lib/auth/account-types"
    );
    const intent = parseProductIntent(user.user_metadata?.product_intent);
    if (!productIntentAllowsMode(intent, mode)) {
      return {
        error:
          intent === "marketplace"
            ? "This store is configured for Marketplace only."
            : intent === "salon_pos"
              ? "This store is configured for Salon POS only."
              : "This mode is not available for your workspace.",
      };
    }
  }

  const jar = await cookies();
  jar.set(APP_MODE_COOKIE, mode, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return { success: true, mode };
}

export async function getMyMarketplaceSeller(): Promise<SellerRow | null> {
  const user = await requireAuth();
  const org = await getActiveOrganization();
  const supabase = await createClient();

  const { data: byUser } = await supabase
    .from("marketplace_sellers")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (byUser) return byUser as SellerRow;

  if (org?.organizationId) {
    const { data: byOrg } = await supabase
      .from("marketplace_sellers")
      .select("*")
      .eq("organization_id", org.organizationId)
      .maybeSingle();
    if (byOrg) return byOrg as SellerRow;
  }
  return null;
}

export async function registerMarketplaceSeller(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireAuth();
  const org = await getActiveOrganization();
  const shopName = String(formData.get("shop_name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim() || null;
  if (shopName.length < 2) return { error: "Shop name is required." };

  const { requireContactPhone } = await import("@/lib/phone/contact");
  const phoneResult = requireContactPhone(String(formData.get("phone") ?? ""));
  if (!phoneResult.ok) return { error: phoneResult.error };

  const baseSlug = slugify(shopName);
  const supabase = await createClient();

  const existing = await getMyMarketplaceSeller();
  if (existing) return { error: "You already have a marketplace seller profile." };

  let slug = baseSlug;
  for (let i = 0; i < 5; i++) {
    const trySlug = i === 0 ? slug : `${baseSlug}-${i + 1}`;
    const { data: clash } = await supabase
      .from("marketplace_sellers")
      .select("id")
      .eq("slug", trySlug)
      .maybeSingle();
    if (!clash) {
      slug = trySlug;
      break;
    }
  }

  const { error } = await supabase.from("marketplace_sellers").insert({
    user_id: user.id,
    organization_id: org?.organizationId ?? null,
    shop_name: shopName,
    slug,
    bio,
    phone: phoneResult.phone,
    // Auto-approve — no platform wait for new sellers.
    status: "approved",
  });

  if (error) return { error: error.message };
  revalidatePath("/marketplace");
  return { success: true };
}

const MARKETPLACE_CATEGORIES_TAG = "marketplace-categories";
const MARKETPLACE_PUBLIC_PRODUCTS_TAG = "marketplace-public-products";

export async function invalidateMarketplacePublicCache() {
  updateTag(MARKETPLACE_CATEGORIES_TAG);
  updateTag(MARKETPLACE_PUBLIC_PRODUCTS_TAG);
}

export async function listMarketplaceCategories(): Promise<CategoryRow[]> {
  return unstable_cache(
    async () => {
      const admin = tryCreateAdminClient() ?? (await createClient());
      const { data } = await admin
        .from("marketplace_categories")
        .select("id, name, slug, sort_order, is_active, parent_id, kind, image_url, created_at")
        .eq("is_active", true)
        .order("sort_order");
      return (data ?? []) as CategoryRow[];
    },
    ["marketplace-categories"],
    { revalidate: 120, tags: [MARKETPLACE_CATEGORIES_TAG] }
  )();
}

export async function listSellerProducts(): Promise<ProductRow[]> {
  const seller = await getMyMarketplaceSeller();
  if (!seller) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("marketplace_products")
    .select("*")
    .eq("seller_id", seller.id)
    .order("updated_at", { ascending: false });
  return (data ?? []) as ProductRow[];
}

export async function upsertSellerProduct(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const seller = await getMyMarketplaceSeller();
  if (!seller) return { error: "Register as a seller first." };
  if (seller.status === "suspended") return { error: "Seller account is suspended." };

  const id = String(formData.get("id") ?? "").trim() || null;
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const shortDescription = String(formData.get("short_description") ?? "").trim() || null;
  const categoryId = String(formData.get("category_id") ?? "").trim() || null;
  const brandId = String(formData.get("brand_id") ?? "").trim() || null;
  const price = Number(formData.get("price") ?? 0);
  const salePriceRaw = String(formData.get("sale_price") ?? "").trim();
  const costPriceRaw = String(formData.get("cost_price") ?? "").trim();
  const stock = Math.max(0, Math.floor(Number(formData.get("stock") ?? 0)));
  const imageUrl = String(formData.get("image_url") ?? "").trim() || null;
  const sku = String(formData.get("sku") ?? "").trim() || null;
  const barcode = String(formData.get("barcode") ?? "").trim() || null;
  const seoTitle = String(formData.get("seo_title") ?? "").trim() || null;
  const seoDescription = String(formData.get("seo_description") ?? "").trim() || null;
  const submitForReview = String(formData.get("submit_for_review") ?? "") === "1";

  if (title.length < 2) return { error: "Title is required." };

  const { validateMarketplacePricing } = await import("@/lib/marketplace/pricing");
  const pricing = validateMarketplacePricing({
    costPrice: costPriceRaw === "" ? 0 : Number(costPriceRaw),
    sellingPrice: price,
    discountPrice: salePriceRaw === "" ? null : Number(salePriceRaw),
  });
  if (!pricing.ok) return { error: pricing.error };
  const { costPrice, sellingPrice, discountPrice: salePrice } = pricing;

  const slug = slugify(title);
  const supabase = await createClient();
  // Auto-publish on submit — no platform wait for marketplace listings.
  const status = submitForReview ? "published" : "draft";

  if (id) {
    const patch: Database["public"]["Tables"]["marketplace_products"]["Update"] = {
      title,
      slug,
      description,
      short_description: shortDescription,
      category_id: categoryId,
      brand_id: brandId,
      price: sellingPrice,
      sale_price: salePrice,
      cost_price: costPrice,
      stock,
      image_url: imageUrl,
      sku,
      barcode,
      seo_title: seoTitle,
      seo_description: seoDescription,
      updated_at: new Date().toISOString(),
    };
    if (submitForReview) patch.status = "published";
    const { data: updated, error } = await supabase
      .from("marketplace_products")
      .update(patch)
      .eq("id", id)
      .eq("seller_id", seller.id)
      .select("id")
      .maybeSingle();
    if (error) return { error: error.message };
    if (!updated) return { error: "Product not found for this seller" };
  } else {
    const { error } = await supabase.from("marketplace_products").insert({
      seller_id: seller.id,
      title,
      slug,
      description,
      short_description: shortDescription,
      category_id: categoryId,
      brand_id: brandId,
      price: sellingPrice,
      sale_price: salePrice,
      cost_price: costPrice,
      stock,
      image_url: imageUrl,
      sku,
      barcode,
      seo_title: seoTitle,
      seo_description: seoDescription,
      status,
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/marketplace/products");
  revalidatePath("/shop");
  return { success: true };
}

export async function adjustSellerStock(formData: FormData): Promise<ActionResult> {
  const seller = await getMyMarketplaceSeller();
  if (!seller) return { error: "Not a seller." };
  const productId = String(formData.get("product_id") ?? "").trim();
  const stockRaw = Number(formData.get("stock") ?? 0);
  if (!productId) return { error: "Choose a product" };
  if (!Number.isFinite(stockRaw) || stockRaw < 0) {
    return { error: "Stock must be zero or greater" };
  }
  const stock = Math.floor(stockRaw);
  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("marketplace_products")
    .update({ stock, updated_at: new Date().toISOString() })
    .eq("id", productId)
    .eq("seller_id", seller.id)
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!updated) return { error: "Product not found for this seller" };
  revalidatePath("/marketplace/inventory");
  revalidatePath("/marketplace/products");
  revalidatePath("/shop");
  invalidateMarketplacePublicCache();
  return { success: true };
}

export type PublicProductCard = {
  id: string;
  seller_id: string;
  category_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  price: number;
  sale_price: number | null;
  stock: number;
  image_url: string | null;
  status: ProductRow["status"];
  updated_at: string;
  seller_name: string;
  seller_slug: string;
  category_name: string | null;
  avg_rating: number | null;
  review_count: number;
  /** ISO currency from seller country (PKR, INR, AED, USD…). */
  currency: string;
  /** Seller / org country label (e.g. Pakistan) — used for shop country filters. */
  seller_country: string | null;
};

const PUBLIC_PRODUCT_SELECT =
  "id, seller_id, category_id, title, slug, description, short_description, price, sale_price, stock, image_url, status, updated_at, marketplace_sellers!inner(shop_name, slug, status, country, organization_id), marketplace_categories(name, slug)";

async function listPublicMarketplaceProductsUncached(opts?: {
  q?: string;
  category?: string;
}): Promise<PublicProductCard[]> {
  const admin = tryCreateAdminClient();
  if (!admin) return [];

  const q = (opts?.q ?? "").trim();
  const qSafe = q.replace(/[%(),]/g, "").slice(0, 80);
  let categoryIds: string[] | null = null;

  if (opts?.category) {
    const { data: cats } = await admin
      .from("marketplace_categories")
      .select("id, slug, parent_id")
      .eq("is_active", true);
    const allCats = (cats ?? []) as Array<{
      id: string;
      slug: string;
      parent_id: string | null;
    }>;
    const match = allCats.find((c) => c.slug === opts.category);
    if (!match) return [];
    categoryIds = [match.id];
    for (const c of allCats) {
      if (c.parent_id === match.id) categoryIds.push(c.id);
    }
  }

  let sellerIdsFromName: string[] = [];
  if (qSafe) {
    const { data: sellers } = await admin
      .from("marketplace_sellers")
      .select("id")
      .eq("status", "approved")
      .ilike("shop_name", `%${qSafe}%`)
      .limit(40);
    sellerIdsFromName = (sellers ?? []).map((s) => s.id);
  }

  let query = admin
    .from("marketplace_products")
    .select(PUBLIC_PRODUCT_SELECT)
    .eq("status", "published")
    .eq("marketplace_sellers.status", "approved")
    .gt("stock", 0)
    .order("updated_at", { ascending: false })
    .limit(120);

  if (categoryIds) {
    query = query.in("category_id", categoryIds);
  }
  if (qSafe) {
    const textOr = `title.ilike.%${qSafe}%,description.ilike.%${qSafe}%,short_description.ilike.%${qSafe}%`;
    if (sellerIdsFromName.length) {
      query = query.or(`${textOr},seller_id.in.(${sellerIdsFromName.join(",")})`);
    } else {
      query = query.or(textOr);
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error("[marketplace] listPublicMarketplaceProducts failed", error.message);
    return [];
  }
  if (!data) return [];

  type Row = {
    id: string;
    seller_id: string;
    category_id: string | null;
    title: string;
    slug: string;
    description: string | null;
    short_description: string | null;
    price: number;
    sale_price: number | null;
    stock: number;
    image_url: string | null;
    status: ProductRow["status"];
    updated_at: string;
    marketplace_sellers: {
      shop_name: string;
      slug: string;
      status: string;
      country: string | null;
      organization_id: string | null;
    };
    marketplace_categories: { name: string; slug: string } | null;
  };

  const rows = data as unknown as Row[];

  const productIds = rows.map((r) => r.id);
  const ratingMap = new Map<string, { sum: number; n: number }>();
  if (productIds.length) {
    const { data: reviews } = await admin
      .from("marketplace_reviews")
      .select("product_id, rating")
      .in("product_id", productIds)
      .eq("is_hidden", false);
    for (const r of reviews ?? []) {
      const cur = ratingMap.get(r.product_id) ?? { sum: 0, n: 0 };
      cur.sum += r.rating;
      cur.n += 1;
      ratingMap.set(r.product_id, cur);
    }
  }

  const { currencyFromCountry } = await import("@/lib/currency/from-country");

  const orgIds = [
    ...new Set(
      rows
        .map((r) => r.marketplace_sellers.organization_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const orgCountry = new Map<string, string | null>();
  if (orgIds.length) {
    const { data: orgs } = await admin
      .from("organizations")
      .select("id, country")
      .in("id", orgIds);
    for (const o of orgs ?? []) {
      orgCountry.set(o.id, o.country);
    }
  }

  return rows.map((p) => {
    const stats = ratingMap.get(p.id);
    const country =
      p.marketplace_sellers.country ||
      (p.marketplace_sellers.organization_id
        ? orgCountry.get(p.marketplace_sellers.organization_id)
        : null) ||
      null;
    return {
      id: p.id,
      seller_id: p.seller_id,
      category_id: p.category_id,
      title: p.title,
      slug: p.slug,
      description: p.description,
      short_description: p.short_description,
      price: p.price,
      sale_price: p.sale_price,
      stock: p.stock,
      image_url: p.image_url,
      status: p.status,
      updated_at: p.updated_at,
      seller_name: p.marketplace_sellers.shop_name,
      seller_slug: p.marketplace_sellers.slug,
      category_name: p.marketplace_categories?.name ?? null,
      avg_rating: stats ? stats.sum / stats.n : null,
      review_count: stats?.n ?? 0,
      currency: currencyFromCountry(country).code,
      seller_country: country,
    };
  });
}

export async function listPublicMarketplaceProducts(opts?: {
  q?: string;
  category?: string;
}): Promise<PublicProductCard[]> {
  const qKey = (opts?.q ?? "").trim().toLowerCase();
  const catKey = opts?.category ?? "";
  return unstable_cache(
    () => listPublicMarketplaceProductsUncached(opts),
    ["marketplace-public-products", qKey, catKey],
    { revalidate: 60, tags: [MARKETPLACE_PUBLIC_PRODUCTS_TAG] }
  )();
}

/** Lightweight detail payload for the product Quick View drawer. */
export type MarketplaceQuickViewDetail = {
  images: string[];
  variants: Array<{
    id: string;
    name: string;
    price: number;
    sale_price: number | null;
    stock: number;
  }>;
  description: string | null;
  short_description: string | null;
};

export async function fetchMarketplaceQuickView(
  productId: string
): Promise<MarketplaceQuickViewDetail | null> {
  const { getProductCatalogDetail } = await import("@/lib/marketplace/catalog");
  const detail = await getProductCatalogDetail(productId);
  if (!detail) return null;
  const product = detail.product as {
    image_url: string | null;
    description: string | null;
    short_description: string | null;
  };
  const urls = [
    ...(product.image_url ? [product.image_url] : []),
    ...detail.images.map((i) => i.url).filter(Boolean),
  ];
  const unique = [...new Set(urls)];
  return {
    images: unique,
    variants: detail.variants.map((v) => ({
      id: v.id,
      name: v.name,
      price: Number(v.price),
      sale_price: v.sale_price != null ? Number(v.sale_price) : null,
      stock: v.stock,
    })),
    description: product.description,
    short_description: product.short_description,
  };
}

export async function getPublicMarketplaceProduct(
  productId: string
): Promise<(PublicProductCard & { reviews: Database["public"]["Tables"]["marketplace_reviews"]["Row"][] }) | null> {
  const admin = tryCreateAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("marketplace_products")
    .select(
      "*, marketplace_sellers!inner(shop_name, slug, status, country, organization_id), marketplace_categories(name, slug)"
    )
    .eq("id", productId)
    .eq("status", "published")
    .eq("marketplace_sellers.status", "approved")
    .maybeSingle();
  if (!data) return null;
  const p = data as unknown as ProductRow & {
    marketplace_sellers: {
      shop_name: string;
      slug: string;
      country: string | null;
      organization_id: string | null;
    };
    marketplace_categories: { name: string } | null;
  };
  const { data: reviews } = await admin
    .from("marketplace_reviews")
    .select("*")
    .eq("product_id", productId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(20);

  const { currencyFromCountry } = await import("@/lib/currency/from-country");
  let country = p.marketplace_sellers.country;
  if (!country && p.marketplace_sellers.organization_id) {
    const { data: org } = await admin
      .from("organizations")
      .select("country")
      .eq("id", p.marketplace_sellers.organization_id)
      .maybeSingle();
    country = org?.country ?? null;
  }

  const list = reviews ?? [];
  const avg =
    list.length > 0 ? list.reduce((s, r) => s + r.rating, 0) / list.length : null;

  // Public DTO only — never expose cost_price or internal profit fields.
  return {
    id: p.id,
    seller_id: p.seller_id,
    category_id: p.category_id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    short_description: p.short_description,
    price: Number(p.price),
    sale_price: p.sale_price != null ? Number(p.sale_price) : null,
    stock: Number(p.stock),
    image_url: p.image_url,
    status: p.status,
    updated_at: p.updated_at,
    seller_name: p.marketplace_sellers.shop_name,
    seller_slug: p.marketplace_sellers.slug,
    category_name: p.marketplace_categories?.name ?? null,
    avg_rating: avg,
    review_count: list.length,
    currency: currencyFromCountry(country).code,
    seller_country: country,
    reviews: list as Database["public"]["Tables"]["marketplace_reviews"]["Row"][],
  };
}

export async function placeMarketplaceCodOrder(input: {
  buyerName: string;
  buyerPhone: string;
  buyerAddress: string;
  buyerNotes?: string;
  addressId?: string;
  buyerEmail?: string;
  paymentMethod?: "COD" | "CARD";
  items: { productId: string; quantity: number; variantId?: string | null }[];
}): Promise<ActionResult & { orderNumber?: string }> {
  let buyerUserId: string | null = null;
  let buyerEmail: string | null = input.buyerEmail?.trim() || null;
  try {
    const user = await requireAuth();
    if (!isCustomerAccount(user.user_metadata as Record<string, unknown>)) {
      return {
        error:
          "Marketplace orders need a shopper account. Sign out of your salon login, then create or sign in as a shopper.",
      };
    }
    buyerUserId = user.id;
    if (!buyerEmail) buyerEmail = user.email ?? null;
  } catch {
    return { error: "Sign in with a shopper account to place a Marketplace order." };
  }

  const paymentMethod = input.paymentMethod === "CARD" ? "CARD" : "COD";
  const name = input.buyerName.trim();
  const phone = input.buyerPhone.trim();
  const address = input.buyerAddress.trim();
  if (name.length < 2) return { error: "Name is required." };
  if (phone.length < 7) return { error: "Phone is required." };
  if (address.length < 5) return { error: "Address is required." };
  if (!input.items.length) return { error: "Cart is empty." };
  if (paymentMethod === "CARD" && !buyerEmail) {
    return { error: "Email is required for card payments (invoice delivery)." };
  }

  const adminClient = tryCreateAdminClient();
  if (!adminClient) return { error: "Checkout unavailable right now." };
  const admin = adminClient;

  const { isMarketplaceEnabled } = await import("@/lib/marketplace/settings");
  if (!(await isMarketplaceEnabled())) {
    return { error: "Marketplace checkout is temporarily unavailable." };
  }

  const productIds = [...new Set(input.items.map((i) => i.productId))];
  const { data: products } = await admin
    .from("marketplace_products")
    .select(
      "id, title, sku, price, sale_price, cost_price, stock, seller_id, status, marketplace_sellers!inner(status, country, organization_id)"
    )
    .in("id", productIds);

  if (!products?.length) return { error: "Products not found." };

  const { effectiveProductPrice, roundMoney } = await import("@/lib/marketplace/pricing");

  type P = {
    id: string;
    title: string;
    sku: string | null;
    price: number;
    sale_price: number | null;
    cost_price: number | null;
    stock: number;
    seller_id: string;
    status: string;
    marketplace_sellers: {
      status: string;
      country: string | null;
      organization_id: string | null;
    };
  };
  const byId = new Map((products as unknown as P[]).map((p) => [p.id, p]));

  const { currencyFromCountry } = await import("@/lib/currency/from-country");
  const firstSeller = (products as unknown as P[])[0]?.marketplace_sellers;
  let orderCountry = firstSeller?.country ?? null;
  if (!orderCountry && firstSeller?.organization_id) {
    const { data: org } = await admin
      .from("organizations")
      .select("country")
      .eq("id", firstSeller.organization_id)
      .maybeSingle();
    orderCountry = org?.country ?? null;
  }
  const orderCurrency = currencyFromCountry(orderCountry).code;

  const variantIds = [
    ...new Set(input.items.map((i) => i.variantId).filter(Boolean)),
  ] as string[];
  const variantById = new Map<
    string,
    { id: string; product_id: string; name: string; price: number; sale_price: number | null; stock: number; is_active: boolean }
  >();
  if (variantIds.length) {
    const { data: variants } = await admin
      .from("marketplace_product_variants")
      .select("id, product_id, name, price, sale_price, stock, is_active")
      .in("id", variantIds);
    for (const v of variants ?? []) variantById.set(v.id, v);
  }

  const lines: {
    product_id: string;
    seller_id: string;
    product_title: string;
    product_sku: string | null;
    unit_price: number;
    list_unit_price: number;
    unit_cost: number;
    unit_discount: number;
    quantity: number;
    line_total: number;
    variant_id: string | null;
    variant_name: string | null;
    fulfillment_status: "placed";
  }[] = [];

  let subtotal = 0;
  for (const item of input.items) {
    const p = byId.get(item.productId);
    if (!p || p.status !== "published" || p.marketplace_sellers.status !== "approved") {
      return { error: "One or more products are unavailable." };
    }

    let listUnitPrice = roundMoney(Number(p.price));
    let unitPrice = effectiveProductPrice({ price: p.price, sale_price: p.sale_price });
    let stock = p.stock;
    let variantId: string | null = null;
    let variantName: string | null = null;
    let title = p.title;
    const unitCost = roundMoney(Math.max(0, Number(p.cost_price) || 0));

    if (item.variantId) {
      const v = variantById.get(item.variantId);
      if (!v || v.product_id !== p.id || !v.is_active) {
        return { error: `Variant unavailable for ${p.title}.` };
      }
      listUnitPrice = roundMoney(Number(v.price));
      unitPrice = effectiveProductPrice({ price: v.price, sale_price: v.sale_price });
      stock = v.stock;
      variantId = v.id;
      variantName = v.name;
      title = `${p.title} (${v.name})`;
    }

    if (item.quantity < 1 || item.quantity > stock) {
      return { error: `Insufficient stock for ${title}.` };
    }
    const unitDiscount = roundMoney(Math.max(0, listUnitPrice - unitPrice));
    const lineTotal = roundMoney(unitPrice * item.quantity);
    subtotal += lineTotal;
    lines.push({
      product_id: p.id,
      seller_id: p.seller_id,
      product_title: title,
      product_sku: p.sku,
      unit_price: unitPrice,
      list_unit_price: listUnitPrice,
      unit_cost: unitCost,
      unit_discount: unitDiscount,
      quantity: item.quantity,
      line_total: lineTotal,
      variant_id: variantId,
      variant_name: variantName,
      fulfillment_status: "placed",
    });
  }
  subtotal = roundMoney(subtotal);

  const { data: orderNumData } = await admin.rpc("next_marketplace_order_number");
  const orderNumber =
    (typeof orderNumData === "string" && orderNumData) || `MP-${Date.now()}`;
  const idempotencyKey = `${paymentMethod.toLowerCase()}:${buyerUserId}:${orderNumber}`;

  const { getPaymentProvider } = await import("@/lib/marketplace/payments");
  const payment = getPaymentProvider(paymentMethod === "CARD" ? "card" : "cod");
  const paymentStatus = paymentMethod === "CARD" ? "pending" : "unpaid";

  const { data: order, error: orderErr } = await admin
    .from("marketplace_orders")
    .insert({
      order_number: orderNumber,
      buyer_name: name,
      buyer_phone: phone,
      buyer_address: address,
      buyer_notes: input.buyerNotes?.trim() || null,
      buyer_user_id: buyerUserId,
      status: "placed",
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      payment_provider: payment.name,
      idempotency_key: idempotencyKey,
      currency: orderCurrency,
      subtotal,
      total: subtotal,
    })
    .select("id, order_number")
    .single();

  if (orderErr || !order) return { error: orderErr?.message ?? "Could not create order." };

  async function cancelOrphanOrder(reason: string) {
    await admin
      .from("marketplace_orders")
      .update({
        status: "cancelled",
        payment_status: "unpaid",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order!.id);
    await admin
      .from("marketplace_seller_orders")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("order_id", order!.id);
    return { error: reason } as const;
  }

  // Per-seller sub-orders
  const bySeller = new Map<string, typeof lines>();
  for (const l of lines) {
    const cur = bySeller.get(l.seller_id) ?? [];
    cur.push(l);
    bySeller.set(l.seller_id, cur);
  }

  const sellerOrderIdBySeller = new Map<string, string>();
  for (const [sellerId, sellerLines] of bySeller) {
    const sellerSubtotal = sellerLines.reduce((s, l) => s + l.line_total, 0);
    const { data: sellerOrder, error: soErr } = await admin
      .from("marketplace_seller_orders")
      .insert({
        order_id: order.id,
        seller_id: sellerId,
        status: "placed",
        subtotal: sellerSubtotal,
        shipping_fee: 0,
        total: sellerSubtotal,
      })
      .select("id")
      .single();
    if (soErr || !sellerOrder) {
      return cancelOrphanOrder(soErr?.message ?? "Could not create seller order.");
    }
    sellerOrderIdBySeller.set(sellerId, sellerOrder.id);
  }

  const itemRows = lines.map((l) => ({
    ...l,
    order_id: order.id,
    seller_order_id: sellerOrderIdBySeller.get(l.seller_id) ?? null,
  }));
  let { error: itemsErr } = await admin.from("marketplace_order_items").insert(itemRows);
  // Soft fallback before pricing-snapshot migration is applied.
  if (
    itemsErr &&
    (itemsErr.message.includes("unit_cost") ||
      itemsErr.message.includes("list_unit_price") ||
      itemsErr.message.includes("unit_discount") ||
      itemsErr.message.includes("product_sku"))
  ) {
    const legacy = itemRows.map(
      ({
        product_id,
        seller_id,
        product_title,
        unit_price,
        quantity,
        line_total,
        variant_id,
        variant_name,
        fulfillment_status,
        order_id,
        seller_order_id,
      }) => ({
        product_id,
        seller_id,
        product_title,
        unit_price,
        quantity,
        line_total,
        variant_id,
        variant_name,
        fulfillment_status,
        order_id,
        seller_order_id,
      })
    );
    ({ error: itemsErr } = await admin.from("marketplace_order_items").insert(legacy));
  }
  if (itemsErr) {
    return cancelOrphanOrder(itemsErr.message);
  }

  // Persist COD payment intent (architecture hook; no capture)
  const intent = await payment.createPayment({
    orderId: order.id,
    amount: subtotal,
    currency: orderCurrency,
    idempotencyKey,
  });
  try {
    await admin.from("marketplace_payment_intents").insert({
      order_id: order.id,
      provider: intent.provider,
      provider_ref: intent.providerRef ?? null,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
      idempotency_key: idempotencyKey,
    });
  } catch {
    // Phase 2 table may be pending apply — order still succeeds
  }

  type AppliedStock = {
    kind: "variant" | "product";
    id: string;
    quantity: number;
    title: string;
  };
  const appliedStock: AppliedStock[] = [];
  let stockFailedTitle: string | null = null;

  for (const l of lines) {
    if (l.variant_id) {
      const v = variantById.get(l.variant_id)!;
      const next = Math.max(0, Number(v.stock) - l.quantity);
      const { data: updated, error: stockErr } = await admin
        .from("marketplace_product_variants")
        .update({ stock: next, updated_at: new Date().toISOString() })
        .eq("id", l.variant_id)
        .gte("stock", l.quantity)
        .select("id")
        .maybeSingle();
      if (stockErr || !updated) {
        stockFailedTitle = l.product_title;
        break;
      }
      v.stock = next;
      appliedStock.push({
        kind: "variant",
        id: l.variant_id,
        quantity: l.quantity,
        title: l.product_title,
      });
    } else {
      const p = byId.get(l.product_id)!;
      const next = Math.max(0, Number(p.stock) - l.quantity);
      const { data: updated, error: stockErr } = await admin
        .from("marketplace_products")
        .update({ stock: next, updated_at: new Date().toISOString() })
        .eq("id", l.product_id)
        .gte("stock", l.quantity)
        .select("id")
        .maybeSingle();
      if (stockErr || !updated) {
        stockFailedTitle = l.product_title;
        break;
      }
      p.stock = next;
      appliedStock.push({
        kind: "product",
        id: l.product_id,
        quantity: l.quantity,
        title: l.product_title,
      });
    }
  }

  if (stockFailedTitle) {
    // Reverse successful decrements so cancel does not leave stock wrong.
    for (const applied of appliedStock.reverse()) {
      if (applied.kind === "variant") {
        const { data: row } = await admin
          .from("marketplace_product_variants")
          .select("stock")
          .eq("id", applied.id)
          .maybeSingle();
        const current = Number(row?.stock ?? 0);
        await admin
          .from("marketplace_product_variants")
          .update({
            stock: current + applied.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", applied.id);
      } else {
        const { data: row } = await admin
          .from("marketplace_products")
          .select("stock")
          .eq("id", applied.id)
          .maybeSingle();
        const current = Number(row?.stock ?? 0);
        await admin
          .from("marketplace_products")
          .update({
            stock: current + applied.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", applied.id);
      }
    }

    await admin
      .from("marketplace_orders")
      .update({
        status: "cancelled",
        payment_status: "unpaid",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);
    await admin
      .from("marketplace_seller_orders")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("order_id", order.id);
    return {
      error: `Insufficient stock for: ${stockFailedTitle}. Please refresh cart and try again.`,
    };
  }

  try {
    const { trackMarketplaceEvent } = await import("@/lib/marketplace/analytics");
    for (const [sellerId] of bySeller) {
      await trackMarketplaceEvent({
        eventType: "purchase",
        sellerId,
        meta: { orderId: order.id, orderNumber: order.order_number, paymentMethod },
      });
    }
  } catch {
    // analytics best-effort
  }

  if (buyerEmail) {
    try {
      const { notifyMarketplaceOrderInvoice } = await import("@/lib/email/notify");
      await notifyMarketplaceOrderInvoice({
        to: buyerEmail,
        buyerName: name,
        orderNumber: order.order_number,
        total: subtotal,
        currency: orderCurrency,
        paymentMethod,
        paymentStatus,
        lines: lines.map((l) => ({
          title: l.product_title,
          quantity: l.quantity,
          lineTotal: l.line_total,
        })),
      });
    } catch {
      // never fail checkout on email
    }
  }

  void input.addressId;
  revalidatePath("/shop");
  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/marketplace/orders");
  revalidatePath("/account");
  return { success: true, orderNumber: order.order_number };
}

/** Mark card/online payment as paid and email payment receipt + invoice care. */
export async function markMarketplaceOrderPaid(
  orderId: string
): Promise<ActionResult> {
  const seller = await getMyMarketplaceSeller();
  if (!seller) return { error: "Not a seller." };
  const admin = createAdminClient();

  const { data: mine } = await admin
    .from("marketplace_order_items")
    .select("id")
    .eq("order_id", orderId)
    .eq("seller_id", seller.id)
    .limit(1);
  if (!mine?.length) return { error: "Order not found." };

  const { data: order } = await admin
    .from("marketplace_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { error: "Order not found." };
  if (order.payment_status === "paid") return { success: true, message: "Already paid." };

  const { error } = await admin
    .from("marketplace_orders")
    .update({
      payment_status: "paid",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (error) return { error: error.message };

  await admin
    .from("marketplace_payment_intents")
    .update({ status: "succeeded", updated_at: new Date().toISOString() })
    .eq("order_id", orderId);

  if (order.buyer_user_id) {
    try {
      const { data: userData } = await admin.auth.admin.getUserById(order.buyer_user_id);
      const email = userData.user?.email;
      if (email) {
        const { notifyMarketplacePaymentReceipt, notifyMarketplaceOrderInvoice } =
          await import("@/lib/email/notify");
        const { data: items } = await admin
          .from("marketplace_order_items")
          .select("product_title, quantity, line_total")
          .eq("order_id", orderId);
        await notifyMarketplacePaymentReceipt({
          to: email,
          buyerName: order.buyer_name,
          orderNumber: order.order_number,
          total: Number(order.total),
          currency: order.currency ?? "PKR",
        });
        await notifyMarketplaceOrderInvoice({
          to: email,
          buyerName: order.buyer_name,
          orderNumber: order.order_number,
          total: Number(order.total),
          currency: order.currency ?? "PKR",
          paymentMethod: order.payment_method,
          paymentStatus: "paid",
          lines: (items ?? []).map((l) => ({
            title: l.product_title,
            quantity: l.quantity,
            lineTotal: Number(l.line_total),
          })),
        });
      }
    } catch {
      /* email best-effort */
    }
  }

  revalidatePath("/marketplace/orders");
  return { success: true, message: "Payment marked paid — invoice emailed." };
}

export async function listSellerOrders() {
  const seller = await getMyMarketplaceSeller();
  if (!seller) return [];
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("marketplace_order_items")
    .select("*, marketplace_orders(*)")
    .eq("seller_id", seller.id)
    .order("created_at", { ascending: false })
    .limit(100);

  type Row = {
    id: string;
    order_id: string;
    product_title: string;
    quantity: number;
    line_total: number;
    unit_price: number;
    marketplace_orders: Database["public"]["Tables"]["marketplace_orders"]["Row"];
  };

  const byOrder = new Map<
    string,
    {
      order: Database["public"]["Tables"]["marketplace_orders"]["Row"];
      items: Row[];
      sellerTotal: number;
    }
  >();

  for (const raw of (items ?? []) as unknown as Row[]) {
    const o = raw.marketplace_orders;
    if (!o) continue;
    const cur = byOrder.get(o.id) ?? { order: o, items: [], sellerTotal: 0 };
    cur.items.push(raw);
    cur.sellerTotal += Number(raw.line_total);
    byOrder.set(o.id, cur);
  }

  return Array.from(byOrder.values()).sort(
    (a, b) =>
      new Date(b.order.created_at).getTime() - new Date(a.order.created_at).getTime()
  );
}

export async function updateSellerOrderStatus(
  orderId: string,
  status: MarketplaceOrderStatus
): Promise<ActionResult> {
  const seller = await getMyMarketplaceSeller();
  if (!seller) return { error: "Not a seller." };

  const admin = createAdminClient();

  // Prefer per-seller sub-order when Phase 2 tables are present
  const { data: sub } = await admin
    .from("marketplace_seller_orders")
    .select("id")
    .eq("order_id", orderId)
    .eq("seller_id", seller.id)
    .maybeSingle();

  if (sub) {
    const { updateSellerSubOrderStatus } = await import("@/lib/marketplace/fulfillment");
    const mapped =
      status === "shipped" || status === "delivered" || status === "confirmed" || status === "cancelled" || status === "placed"
        ? status
        : "confirmed";
    return updateSellerSubOrderStatus(sub.id, mapped);
  }

  const { data: mine } = await admin
    .from("marketplace_order_items")
    .select("id")
    .eq("order_id", orderId)
    .eq("seller_id", seller.id)
    .limit(1);
  if (!mine?.length) return { error: "Order not found." };

  const { data: order } = await admin
    .from("marketplace_orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (!order) return { error: "Order not found." };

  const { error } = await admin
    .from("marketplace_orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) return { error: error.message };

  if (status === "delivered" && order.status !== "delivered") {
    await ensureCommissionsForOrder(orderId);
  }

  revalidatePath("/marketplace/orders");
  revalidatePath("/marketplace/payouts");
  return { success: true };
}

async function ensureCommissionsForOrder(orderId: string) {
  const admin = createAdminClient();
  const { data: items } = await admin
    .from("marketplace_order_items")
    .select("seller_id, line_total, product_id")
    .eq("order_id", orderId);
  if (!items?.length) return;

  const productIds = [...new Set(items.map((i) => i.product_id).filter(Boolean))] as string[];
  const categoryByProduct = new Map<string, string | null>();
  if (productIds.length) {
    const { data: products } = await admin
      .from("marketplace_products")
      .select("id, category_id")
      .in("id", productIds);
    for (const p of products ?? []) {
      categoryByProduct.set(p.id, p.category_id);
    }
  }

  type RuleScope = Database["public"]["Tables"]["marketplace_commissions"]["Row"]["rule_scope"];
  type Acc = { gross: number; rate: number; ruleScope: NonNullable<RuleScope> };
  const bySeller = new Map<string, Acc>();

  for (const i of items) {
    const { rate, ruleScope } = await resolveCommissionRate({
      productId: i.product_id,
      sellerId: i.seller_id,
      categoryId: i.product_id ? categoryByProduct.get(i.product_id) ?? null : null,
    });
    const scope: NonNullable<RuleScope> =
      (ruleScope as NonNullable<RuleScope> | undefined) ?? "settings";
    const prev = bySeller.get(i.seller_id);
    if (!prev) {
      bySeller.set(i.seller_id, { gross: Number(i.line_total), rate, ruleScope: scope });
    } else {
      // Weighted average rate across lines for this seller on the order
      const nextGross = prev.gross + Number(i.line_total);
      const weighted =
        nextGross > 0
          ? (prev.rate * prev.gross + rate * Number(i.line_total)) / nextGross
          : rate;
      bySeller.set(i.seller_id, {
        gross: nextGross,
        rate: weighted,
        ruleScope: prev.ruleScope === scope ? scope : "settings",
      });
    }
  }

  for (const [sellerId, { gross, rate, ruleScope }] of bySeller) {
    const commission = Math.round(gross * rate * 100) / 100;
    await admin.from("marketplace_commissions").upsert(
      {
        order_id: orderId,
        seller_id: sellerId,
        gross_amount: gross,
        rate,
        commission_amount: commission,
        payout_status: "owed",
        rule_scope: ruleScope,
      },
      { onConflict: "order_id,seller_id" }
    );
  }
}

export async function getSellerPayoutSummary() {
  const seller = await getMyMarketplaceSeller();
  if (!seller) return { owed: 0, paid: 0, rows: [] as Database["public"]["Tables"]["marketplace_commissions"]["Row"][] };
  const supabase = await createClient();
  const { data } = await supabase
    .from("marketplace_commissions")
    .select("*")
    .eq("seller_id", seller.id)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Database["public"]["Tables"]["marketplace_commissions"]["Row"][];
  const owed = rows.filter((r) => r.payout_status === "owed").reduce((s, r) => s + Number(r.commission_amount), 0);
  const paid = rows.filter((r) => r.payout_status === "paid").reduce((s, r) => s + Number(r.commission_amount), 0);
  return { owed, paid, rows };
}

export async function getSellerDashboardStats() {
  const seller = await getMyMarketplaceSeller();
  if (!seller) return null;
  const supabase = await createClient();
  const [{ data: productRows }, orders, payouts] = await Promise.all([
    supabase
      .from("marketplace_products")
      .select("id, price, sale_price, cost_price, stock, status")
      .eq("seller_id", seller.id),
    listSellerOrders(),
    getSellerPayoutSummary(),
  ]);
  const products = productRows ?? [];
  const {
    applyCommissionToInventoryKpis,
    summarizeMarketplaceInventory,
  } = await import("@/lib/marketplace/pricing");
  const { getDefaultCommissionRate } = await import("@/lib/marketplace/commission");
  const commissionRate = await getDefaultCommissionRate();
  const inventory = applyCommissionToInventoryKpis(
    summarizeMarketplaceInventory(products),
    commissionRate
  );
  const openOrders = orders.filter((o) =>
    ["placed", "confirmed", "shipped"].includes(o.order.status)
  ).length;
  return {
    seller,
    productCount: inventory.totalProducts,
    openOrders,
    owedCommission: payouts.owed,
    commissionRate,
    inventory,
  };
}

export async function submitMarketplaceReview(formData: FormData): Promise<ActionResult> {
  const productId = String(formData.get("product_id") ?? "");
  const rating = Math.min(5, Math.max(1, Math.floor(Number(formData.get("rating") ?? 5))));
  const comment = String(formData.get("comment") ?? "").trim() || null;
  const reviewerName = String(formData.get("reviewer_name") ?? "").trim() || "Guest";
  if (!productId) return { error: "Missing product." };

  const admin = tryCreateAdminClient() ?? (await createClient());
  const { error } = await admin.from("marketplace_reviews").insert({
    product_id: productId,
    rating,
    comment,
    reviewer_name: reviewerName,
  });
  if (error) return { error: error.message };
  revalidatePath("/shop");
  revalidatePath(`/product/${productId}`);
  // Slug URLs also need refresh — path resolved client-side from product slug.
  revalidatePath("/product", "layout");
  invalidateMarketplacePublicCache();
  return { success: true };
}

export async function listSellerReviews() {
  const seller = await getMyMarketplaceSeller();
  if (!seller) return [];
  const admin = createAdminClient();
  const { data: products } = await admin
    .from("marketplace_products")
    .select("id, title")
    .eq("seller_id", seller.id);
  const ids = (products ?? []).map((p) => p.id);
  if (!ids.length) return [];
  const titleMap = new Map((products ?? []).map((p) => [p.id, p.title]));
  const { data: reviews } = await admin
    .from("marketplace_reviews")
    .select("*")
    .in("product_id", ids)
    .order("created_at", { ascending: false })
    .limit(50);
  return (reviews ?? []).map((r) => ({
    ...r,
    product_title: titleMap.get(r.product_id) ?? "Product",
  }));
}

/* ——— Platform admin ——— */

async function requireMarketplacePlatformAdmin() {
  const user = await requireAuth();
  const { isPlatformAdminEmail } = await import("@/lib/billing/subscription");
  if (!isPlatformAdminEmail(user.email)) {
    throw new Error("Unauthorized");
  }
  return user;
}

export type PlatformMarketplaceSeller = {
  id: string;
  user_id: string;
  organization_id: string | null;
  shop_name: string;
  slug: string;
  bio: string | null;
  phone: string | null;
  payout_notes: string | null;
  status: "pending" | "approved" | "suspended";
  created_at: string;
  updated_at: string;
  ownerEmail: string | null;
  ownerName: string | null;
  ownerAuthPhone: string | null;
  organizationName: string | null;
  organizationSlug: string | null;
  organizationPhone: string | null;
  organizationWhatsapp: string | null;
  organizationCity: string | null;
  organizationCountry: string | null;
  productCount: number;
};

export async function listPlatformMarketplaceSellers(): Promise<
  PlatformMarketplaceSeller[]
> {
  await requireMarketplacePlatformAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from("marketplace_sellers")
    .select("*")
    .order("created_at", { ascending: false });

  const sellers = (data ?? []) as SellerRow[];
  if (sellers.length === 0) return [];

  const orgIds = [
    ...new Set(sellers.map((s) => s.organization_id).filter(Boolean) as string[]),
  ];
  const sellerIds = sellers.map((s) => s.id);

  const [orgsRes, productCountsRes] = await Promise.all([
    orgIds.length
      ? admin
          .from("organizations")
          .select("id, name, slug, phone, whatsapp_phone, city, country")
          .in("id", orgIds)
      : Promise.resolve({ data: [] as {
          id: string;
          name: string;
          slug: string;
          phone: string | null;
          whatsapp_phone: string | null;
          city: string | null;
          country: string | null;
        }[] }),
    admin
      .from("marketplace_products")
      .select("seller_id")
      .in("seller_id", sellerIds),
  ]);

  const orgById = new Map(
    (orgsRes.data ?? []).map((o) => [o.id, o] as const)
  );
  const productCountBySeller = new Map<string, number>();
  for (const row of productCountsRes.data ?? []) {
    productCountBySeller.set(
      row.seller_id,
      (productCountBySeller.get(row.seller_id) ?? 0) + 1
    );
  }

  const enriched = await Promise.all(
    sellers.map(async (s) => {
      let ownerEmail: string | null = null;
      let ownerName: string | null = null;
      let ownerAuthPhone: string | null = null;
      try {
        const { data: authUser } = await admin.auth.admin.getUserById(s.user_id);
        const user = authUser.user;
        ownerEmail = user?.email ?? null;
        ownerAuthPhone = user?.phone?.trim() || null;
        const meta = user?.user_metadata as
          | { full_name?: string; name?: string }
          | undefined;
        ownerName =
          (typeof meta?.full_name === "string" && meta.full_name.trim()) ||
          (typeof meta?.name === "string" && meta.name.trim()) ||
          null;
      } catch {
        /* optional */
      }

      const org = s.organization_id ? orgById.get(s.organization_id) : null;
      const phoneCol = (s as SellerRow & { phone?: string | null }).phone ?? null;

      return {
        id: s.id,
        user_id: s.user_id,
        organization_id: s.organization_id,
        shop_name: s.shop_name,
        slug: s.slug,
        bio: s.bio,
        phone: phoneCol,
        payout_notes: s.payout_notes,
        status: s.status,
        created_at: s.created_at,
        updated_at: s.updated_at,
        ownerEmail,
        ownerName,
        ownerAuthPhone,
        organizationName: org?.name ?? null,
        organizationSlug: org?.slug ?? null,
        organizationPhone: org?.phone ?? null,
        organizationWhatsapp: org?.whatsapp_phone ?? null,
        organizationCity: org?.city ?? null,
        organizationCountry: org?.country ?? null,
        productCount: productCountBySeller.get(s.id) ?? 0,
      };
    })
  );

  return enriched;
}

export async function setMarketplaceSellerStatus(
  sellerId: string,
  status: "pending" | "approved" | "suspended"
): Promise<ActionResult> {
  await requireMarketplacePlatformAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("marketplace_sellers")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", sellerId);
  if (error) return { error: error.message };
  revalidatePath("/platform");
  return { success: true };
}

export async function listPlatformPendingProducts() {
  await requireMarketplacePlatformAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from("marketplace_products")
    .select("*, marketplace_sellers(shop_name, slug)")
    .in("status", ["pending", "published", "rejected"])
    .order("updated_at", { ascending: false })
    .limit(80);
  return data ?? [];
}

export async function moderateMarketplaceProduct(
  productId: string,
  status: "published" | "rejected",
  reason?: string
): Promise<ActionResult> {
  await requireMarketplacePlatformAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("marketplace_products")
    .update({
      status,
      rejection_reason: status === "rejected" ? reason ?? "Rejected" : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);
  if (error) return { error: error.message };
  revalidatePath("/platform");
  revalidatePath("/shop");
  return { success: true };
}

export async function listPlatformMarketplaceCommissions() {
  await requireMarketplacePlatformAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from("marketplace_commissions")
    .select("*, marketplace_sellers(shop_name), marketplace_orders(order_number)")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function markMarketplaceCommissionsPaid(
  sellerId: string,
  notes?: string
): Promise<ActionResult> {
  const user = await requireMarketplacePlatformAdmin();
  const admin = createAdminClient();
  const { data: owed } = await admin
    .from("marketplace_commissions")
    .select("*")
    .eq("seller_id", sellerId)
    .eq("payout_status", "owed");
  if (!owed?.length) return { error: "Nothing owed." };
  const amount = owed.reduce((s, r) => s + Number(r.commission_amount), 0);
  const { data: payout, error: pErr } = await admin
    .from("marketplace_payouts")
    .insert({
      seller_id: sellerId,
      amount,
      notes: notes ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (pErr || !payout) return { error: pErr?.message ?? "Payout failed." };

  const { error } = await admin
    .from("marketplace_commissions")
    .update({ payout_status: "paid", payout_id: payout.id })
    .eq("seller_id", sellerId)
    .eq("payout_status", "owed");
  if (error) return { error: error.message };
  revalidatePath("/platform");
  return { success: true };
}

export async function listPlatformMarketplaceReviews() {
  await requireMarketplacePlatformAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from("marketplace_reviews")
    .select("*, marketplace_products(title)")
    .order("created_at", { ascending: false })
    .limit(80);
  return data ?? [];
}

export async function setMarketplaceReviewHidden(
  reviewId: string,
  isHidden: boolean
): Promise<ActionResult> {
  await requireMarketplacePlatformAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("marketplace_reviews")
    .update({ is_hidden: isHidden })
    .eq("id", reviewId);
  if (error) return { error: error.message };
  revalidatePath("/platform");
  revalidatePath("/shop");
  return { success: true };
}
