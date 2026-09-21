"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireAuth } from "@/lib/auth/session";
import { getActiveOrganization } from "@/lib/auth/organization";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, tryCreateAdminClient } from "@/lib/supabase/admin";
import {
  APP_MODE_COOKIE,
  MARKETPLACE_COMMISSION_RATE,
  slugify,
  type AppMode,
  type MarketplaceOrderStatus,
} from "@/lib/marketplace/constants";
import type { ActionResult } from "@/types/commerce";
import type { Database } from "@/types/database.types";

type SellerRow = Database["public"]["Tables"]["marketplace_sellers"]["Row"];
type ProductRow = Database["public"]["Tables"]["marketplace_products"]["Row"];
type CategoryRow = Database["public"]["Tables"]["marketplace_categories"]["Row"];

export async function getAppMode(): Promise<AppMode> {
  const jar = await cookies();
  const v = jar.get(APP_MODE_COOKIE)?.value;
  return v === "marketplace" ? "marketplace" : "saas";
}

export async function setAppMode(mode: AppMode): Promise<ActionResult & { mode?: AppMode }> {
  const user = await requireAuth();
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
    status: "pending",
  });

  if (error) return { error: error.message };
  revalidatePath("/marketplace");
  return { success: true };
}

export async function listMarketplaceCategories(): Promise<CategoryRow[]> {
  const admin = tryCreateAdminClient() ?? (await createClient());
  const { data } = await admin
    .from("marketplace_categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []) as CategoryRow[];
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
  const categoryId = String(formData.get("category_id") ?? "").trim() || null;
  const price = Number(formData.get("price") ?? 0);
  const stock = Math.max(0, Math.floor(Number(formData.get("stock") ?? 0)));
  const imageUrl = String(formData.get("image_url") ?? "").trim() || null;
  const submitForReview = String(formData.get("submit_for_review") ?? "") === "1";

  if (title.length < 2) return { error: "Title is required." };
  if (!(price >= 0)) return { error: "Invalid price." };

  const slug = slugify(title);
  const supabase = await createClient();
  const status = submitForReview ? "pending" : "draft";

  if (id) {
    const patch: Database["public"]["Tables"]["marketplace_products"]["Update"] = {
      title,
      slug,
      description,
      category_id: categoryId,
      price,
      stock,
      image_url: imageUrl,
      updated_at: new Date().toISOString(),
    };
    if (submitForReview) patch.status = "pending";
    const { error } = await supabase
      .from("marketplace_products")
      .update(patch)
      .eq("id", id)
      .eq("seller_id", seller.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("marketplace_products").insert({
      seller_id: seller.id,
      title,
      slug,
      description,
      category_id: categoryId,
      price,
      stock,
      image_url: imageUrl,
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
  const productId = String(formData.get("product_id") ?? "");
  const stock = Math.max(0, Math.floor(Number(formData.get("stock") ?? 0)));
  const supabase = await createClient();
  const { error } = await supabase
    .from("marketplace_products")
    .update({ stock, updated_at: new Date().toISOString() })
    .eq("id", productId)
    .eq("seller_id", seller.id);
  if (error) return { error: error.message };
  revalidatePath("/marketplace/inventory");
  return { success: true };
}

export type PublicProductCard = ProductRow & {
  seller_name: string;
  seller_slug: string;
  category_name: string | null;
  avg_rating: number | null;
  review_count: number;
};

export async function listPublicMarketplaceProducts(opts?: {
  q?: string;
  category?: string;
}): Promise<PublicProductCard[]> {
  const admin = tryCreateAdminClient();
  if (!admin) return [];

  let query = admin
    .from("marketplace_products")
    .select(
      "*, marketplace_sellers!inner(shop_name, slug, status), marketplace_categories(name, slug)"
    )
    .eq("status", "published")
    .eq("marketplace_sellers.status", "approved")
    .gt("stock", 0)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (opts?.category) {
    query = query.eq("marketplace_categories.slug", opts.category);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const q = (opts?.q ?? "").trim().toLowerCase();
  const rows = (data as unknown as Array<
    ProductRow & {
      marketplace_sellers: { shop_name: string; slug: string; status: string };
      marketplace_categories: { name: string; slug: string } | null;
    }
  >).filter((p) => {
    if (!q) return true;
    return (
      p.title.toLowerCase().includes(q) ||
      (p.description ?? "").toLowerCase().includes(q) ||
      p.marketplace_sellers.shop_name.toLowerCase().includes(q)
    );
  });

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

  return rows.map((p) => {
    const stats = ratingMap.get(p.id);
    return {
      ...p,
      seller_name: p.marketplace_sellers.shop_name,
      seller_slug: p.marketplace_sellers.slug,
      category_name: p.marketplace_categories?.name ?? null,
      avg_rating: stats ? stats.sum / stats.n : null,
      review_count: stats?.n ?? 0,
    };
  });
}

export async function getPublicMarketplaceProduct(
  productId: string
): Promise<(PublicProductCard & { reviews: Database["public"]["Tables"]["marketplace_reviews"]["Row"][] }) | null> {
  const admin = tryCreateAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("marketplace_products")
    .select(
      "*, marketplace_sellers!inner(shop_name, slug, status), marketplace_categories(name, slug)"
    )
    .eq("id", productId)
    .eq("status", "published")
    .eq("marketplace_sellers.status", "approved")
    .maybeSingle();
  if (!data) return null;
  const p = data as unknown as ProductRow & {
    marketplace_sellers: { shop_name: string; slug: string };
    marketplace_categories: { name: string } | null;
  };
  const { data: reviews } = await admin
    .from("marketplace_reviews")
    .select("*")
    .eq("product_id", productId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(20);

  const list = reviews ?? [];
  const avg =
    list.length > 0 ? list.reduce((s, r) => s + r.rating, 0) / list.length : null;

  return {
    ...p,
    seller_name: p.marketplace_sellers.shop_name,
    seller_slug: p.marketplace_sellers.slug,
    category_name: p.marketplace_categories?.name ?? null,
    avg_rating: avg,
    review_count: list.length,
    reviews: list as Database["public"]["Tables"]["marketplace_reviews"]["Row"][],
  };
}

export async function placeMarketplaceCodOrder(input: {
  buyerName: string;
  buyerPhone: string;
  buyerAddress: string;
  buyerNotes?: string;
  items: { productId: string; quantity: number }[];
}): Promise<ActionResult & { orderNumber?: string }> {
  try {
    await requireAuth();
  } catch {
    return { error: "Sign in to place a Marketplace order." };
  }

  const name = input.buyerName.trim();
  const phone = input.buyerPhone.trim();
  const address = input.buyerAddress.trim();
  if (name.length < 2) return { error: "Name is required." };
  if (phone.length < 7) return { error: "Phone is required." };
  if (address.length < 5) return { error: "Address is required." };
  if (!input.items.length) return { error: "Cart is empty." };

  const admin = tryCreateAdminClient();
  if (!admin) return { error: "Checkout unavailable right now." };

  const productIds = input.items.map((i) => i.productId);
  const { data: products } = await admin
    .from("marketplace_products")
    .select("id, title, price, stock, seller_id, status, marketplace_sellers!inner(status)")
    .in("id", productIds);

  if (!products?.length) return { error: "Products not found." };

  type P = {
    id: string;
    title: string;
    price: number;
    stock: number;
    seller_id: string;
    status: string;
    marketplace_sellers: { status: string };
  };
  const byId = new Map((products as unknown as P[]).map((p) => [p.id, p]));

  const lines: {
    product_id: string;
    seller_id: string;
    product_title: string;
    unit_price: number;
    quantity: number;
    line_total: number;
  }[] = [];

  let subtotal = 0;
  for (const item of input.items) {
    const p = byId.get(item.productId);
    if (!p || p.status !== "published" || p.marketplace_sellers.status !== "approved") {
      return { error: "One or more products are unavailable." };
    }
    if (item.quantity < 1 || item.quantity > p.stock) {
      return { error: `Insufficient stock for ${p.title}.` };
    }
    const lineTotal = Number(p.price) * item.quantity;
    subtotal += lineTotal;
    lines.push({
      product_id: p.id,
      seller_id: p.seller_id,
      product_title: p.title,
      unit_price: Number(p.price),
      quantity: item.quantity,
      line_total: lineTotal,
    });
  }

  const { data: orderNumData } = await admin.rpc("next_marketplace_order_number");
  const orderNumber =
    (typeof orderNumData === "string" && orderNumData) ||
    `MP-${Date.now()}`;

  const { data: order, error: orderErr } = await admin
    .from("marketplace_orders")
    .insert({
      order_number: orderNumber,
      buyer_name: name,
      buyer_phone: phone,
      buyer_address: address,
      buyer_notes: input.buyerNotes?.trim() || null,
      status: "placed",
      payment_method: "COD",
      subtotal,
      total: subtotal,
    })
    .select("id, order_number")
    .single();

  if (orderErr || !order) return { error: orderErr?.message ?? "Could not create order." };

  const { error: itemsErr } = await admin.from("marketplace_order_items").insert(
    lines.map((l) => ({ ...l, order_id: order.id }))
  );
  if (itemsErr) return { error: itemsErr.message };

  for (const l of lines) {
    const p = byId.get(l.product_id)!;
    await admin
      .from("marketplace_products")
      .update({ stock: p.stock - l.quantity, updated_at: new Date().toISOString() })
      .eq("id", l.product_id);
  }

  revalidatePath("/shop");
  revalidatePath("/marketplace/orders");
  return { success: true, orderNumber: order.order_number };
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
    .select("seller_id, line_total")
    .eq("order_id", orderId);
  if (!items?.length) return;

  const bySeller = new Map<string, number>();
  for (const i of items) {
    bySeller.set(i.seller_id, (bySeller.get(i.seller_id) ?? 0) + Number(i.line_total));
  }

  for (const [sellerId, gross] of bySeller) {
    const commission = Math.round(gross * MARKETPLACE_COMMISSION_RATE * 100) / 100;
    await admin.from("marketplace_commissions").upsert(
      {
        order_id: orderId,
        seller_id: sellerId,
        gross_amount: gross,
        rate: MARKETPLACE_COMMISSION_RATE,
        commission_amount: commission,
        payout_status: "owed",
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
  const [{ count: productCount }, orders, payouts] = await Promise.all([
    supabase
      .from("marketplace_products")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", seller.id),
    listSellerOrders(),
    getSellerPayoutSummary(),
  ]);
  const openOrders = orders.filter((o) =>
    ["placed", "confirmed", "shipped"].includes(o.order.status)
  ).length;
  return {
    seller,
    productCount: productCount ?? 0,
    openOrders,
    owedCommission: payouts.owed,
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
