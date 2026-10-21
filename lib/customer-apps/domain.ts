import { caAdmin } from "@/lib/customer-apps/admin";

export type AppCustomer = {
  id: string;
  customer_app_id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  salon_customer_id: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

export type AppProduct = {
  id: string;
  customer_app_id: string;
  organization_id: string;
  title: string;
  description: string;
  price: number;
  image_url: string | null;
  pos_product_id: string | null;
  is_active: boolean;
  sort_order: number;
};

export type AppDeal = {
  id: string;
  customer_app_id: string;
  organization_id: string;
  title: string;
  description: string;
  discount_percent: number | null;
  discount_amount: number | null;
  image_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  app_product_id: string | null;
  service_id: string | null;
  is_published: boolean;
  sort_order: number;
};

export type PointType = {
  id: string;
  customer_app_id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  earn_hint: string;
  is_active: boolean;
  sort_order: number;
};

export type LeaderboardTier = {
  id: string;
  customer_app_id: string;
  rank: number;
  title: string;
  description: string;
  reward_kind: "service" | "product" | "custom";
  reward_image_url: string | null;
  service_id: string | null;
  app_product_id: string | null;
  custom_reward_label: string;
};

export type AppBookingRow = {
  id: string;
  scheduled_at: string;
  status: string;
  source: string;
  duration_minutes: number;
  booking_number: string | null;
  customer_id: string;
  app_customer_id: string | null;
  notes: string | null;
  created_at: string;
};

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "").trim();
}

export async function listAppCustomers(customerAppId: string): Promise<AppCustomer[]> {
  const admin = caAdmin();
  const { data, error } = await admin
    .from("customer_app_customers")
    .select(
      "id, customer_app_id, organization_id, first_name, last_name, phone, email, salon_customer_id, notes, is_active, created_at"
    )
    .eq("customer_app_id", customerAppId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as AppCustomer[];
}

export async function upsertAppCustomer(input: {
  customerAppId: string;
  organizationId: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  salonCustomerId?: string | null;
  notes?: string;
}): Promise<AppCustomer> {
  const admin = caAdmin();
  const phone = normalizePhone(input.phone);
  if (!phone) throw new Error("Phone is required");
  const { data: existing } = await admin
    .from("customer_app_customers")
    .select("*")
    .eq("customer_app_id", input.customerAppId)
    .eq("phone", phone)
    .maybeSingle();

  if (existing) {
    const { data, error } = await admin
      .from("customer_app_customers")
      .update({
        first_name: input.firstName.trim() || existing.first_name,
        last_name: input.lastName?.trim() ?? existing.last_name,
        email: input.email?.trim() || existing.email,
        salon_customer_id:
          input.salonCustomerId !== undefined
            ? input.salonCustomerId
            : existing.salon_customer_id,
        notes: input.notes ?? existing.notes,
        is_active: true,
      })
      .eq("id", existing.id)
      .select(
        "id, customer_app_id, organization_id, first_name, last_name, phone, email, salon_customer_id, notes, is_active, created_at"
      )
      .single();
    if (error) throw new Error(error.message);
    return data as AppCustomer;
  }

  const { data, error } = await admin
    .from("customer_app_customers")
    .insert({
      customer_app_id: input.customerAppId,
      organization_id: input.organizationId,
      first_name: input.firstName.trim() || "Guest",
      last_name: input.lastName?.trim() || "",
      phone,
      email: input.email?.trim() || null,
      salon_customer_id: input.salonCustomerId ?? null,
      notes: input.notes ?? null,
    })
    .select(
      "id, customer_app_id, organization_id, first_name, last_name, phone, email, salon_customer_id, notes, is_active, created_at"
    )
    .single();
  if (error) throw new Error(error.message);
  return data as AppCustomer;
}

export async function linkAppCustomerToSalon(
  appCustomerId: string,
  customerAppId: string,
  salonCustomerId: string | null
): Promise<void> {
  const admin = caAdmin();
  const { error } = await admin
    .from("customer_app_customers")
    .update({ salon_customer_id: salonCustomerId })
    .eq("id", appCustomerId)
    .eq("customer_app_id", customerAppId);
  if (error) throw new Error(error.message);
}

export async function listAppBookings(customerAppId: string): Promise<AppBookingRow[]> {
  const admin = caAdmin();
  const { data, error } = await admin
    .from("appointments")
    .select(
      "id, scheduled_at, status, source, duration_minutes, booking_number, customer_id, app_customer_id, notes, created_at"
    )
    .eq("customer_app_id", customerAppId)
    .is("deleted_at", null)
    .order("scheduled_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as AppBookingRow[];
}

export async function listAppProducts(customerAppId: string, activeOnly = false) {
  const admin = caAdmin();
  let q = admin
    .from("customer_app_products")
    .select(
      "id, customer_app_id, organization_id, title, description, price, image_url, pos_product_id, is_active, sort_order"
    )
    .eq("customer_app_id", customerAppId)
    .order("sort_order")
    .order("title");
  if (activeOnly) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as AppProduct[];
}

export async function createAppProduct(input: {
  customerAppId: string;
  organizationId: string;
  title: string;
  description?: string;
  price: number;
  imageUrl?: string;
  posProductId?: string | null;
}): Promise<AppProduct> {
  const admin = caAdmin();
  const { data, error } = await admin
    .from("customer_app_products")
    .insert({
      customer_app_id: input.customerAppId,
      organization_id: input.organizationId,
      title: input.title.trim(),
      description: input.description?.trim() || "",
      price: input.price,
      image_url: input.imageUrl?.trim() || null,
      pos_product_id: input.posProductId || null,
      is_active: true,
    })
    .select(
      "id, customer_app_id, organization_id, title, description, price, image_url, pos_product_id, is_active, sort_order"
    )
    .single();
  if (error) throw new Error(error.message);
  return data as AppProduct;
}

export async function updateAppProduct(
  id: string,
  customerAppId: string,
  patch: Partial<{
    title: string;
    description: string;
    price: number;
    image_url: string | null;
    pos_product_id: string | null;
    is_active: boolean;
  }>
): Promise<void> {
  const admin = caAdmin();
  const { error } = await admin
    .from("customer_app_products")
    .update(patch)
    .eq("id", id)
    .eq("customer_app_id", customerAppId);
  if (error) throw new Error(error.message);
}

export async function deleteAppProduct(id: string, customerAppId: string): Promise<void> {
  const admin = caAdmin();
  const { error } = await admin
    .from("customer_app_products")
    .delete()
    .eq("id", id)
    .eq("customer_app_id", customerAppId);
  if (error) throw new Error(error.message);
}

export async function listAppDeals(customerAppId: string, publishedOnly = false) {
  const admin = caAdmin();
  let q = admin
    .from("customer_app_deals")
    .select(
      "id, customer_app_id, organization_id, title, description, discount_percent, discount_amount, image_url, starts_at, ends_at, app_product_id, service_id, is_published, sort_order"
    )
    .eq("customer_app_id", customerAppId)
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (publishedOnly) q = q.eq("is_published", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as AppDeal[];
}

export async function createAppDeal(input: {
  customerAppId: string;
  organizationId: string;
  title: string;
  description?: string;
  discountPercent?: number | null;
  discountAmount?: number | null;
  imageUrl?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  appProductId?: string | null;
  serviceId?: string | null;
  isPublished?: boolean;
}): Promise<AppDeal> {
  const admin = caAdmin();
  const { data, error } = await admin
    .from("customer_app_deals")
    .insert({
      customer_app_id: input.customerAppId,
      organization_id: input.organizationId,
      title: input.title.trim(),
      description: input.description?.trim() || "",
      discount_percent: input.discountPercent ?? null,
      discount_amount: input.discountAmount ?? null,
      image_url: input.imageUrl?.trim() || null,
      starts_at: input.startsAt || null,
      ends_at: input.endsAt || null,
      app_product_id: input.appProductId || null,
      service_id: input.serviceId || null,
      is_published: input.isPublished ?? false,
    })
    .select(
      "id, customer_app_id, organization_id, title, description, discount_percent, discount_amount, image_url, starts_at, ends_at, app_product_id, service_id, is_published, sort_order"
    )
    .single();
  if (error) throw new Error(error.message);
  return data as AppDeal;
}

export async function updateAppDeal(
  id: string,
  customerAppId: string,
  patch: Record<string, unknown>
): Promise<void> {
  const admin = caAdmin();
  const { error } = await admin
    .from("customer_app_deals")
    .update(patch)
    .eq("id", id)
    .eq("customer_app_id", customerAppId);
  if (error) throw new Error(error.message);
}

export async function deleteAppDeal(id: string, customerAppId: string): Promise<void> {
  const admin = caAdmin();
  const { error } = await admin
    .from("customer_app_deals")
    .delete()
    .eq("id", id)
    .eq("customer_app_id", customerAppId);
  if (error) throw new Error(error.message);
}

export async function listPointTypes(customerAppId: string, activeOnly = false) {
  const admin = caAdmin();
  let q = admin
    .from("customer_app_point_types")
    .select(
      "id, customer_app_id, code, name, description, icon, color, earn_hint, is_active, sort_order"
    )
    .eq("customer_app_id", customerAppId)
    .order("sort_order")
    .order("name");
  if (activeOnly) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as PointType[];
}

export async function ensureDefaultPointType(customerAppId: string): Promise<PointType> {
  const existing = await listPointTypes(customerAppId);
  if (existing.length) return existing[0];
  const admin = caAdmin();
  const { data, error } = await admin
    .from("customer_app_point_types")
    .insert({
      customer_app_id: customerAppId,
      code: "visit",
      name: "Visit points",
      description: "Default points from bookings and purchases",
      earn_hint: "Earn on completed bookings and product purchases",
    })
    .select(
      "id, customer_app_id, code, name, description, icon, color, earn_hint, is_active, sort_order"
    )
    .single();
  if (error) throw new Error(error.message);
  return data as PointType;
}

export async function createPointType(input: {
  customerAppId: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  earnHint?: string;
}): Promise<PointType> {
  const admin = caAdmin();
  const code = input.code
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, "_")
    .slice(0, 32);
  if (!code) throw new Error("Code is required");
  const { data, error } = await admin
    .from("customer_app_point_types")
    .insert({
      customer_app_id: input.customerAppId,
      code,
      name: input.name.trim(),
      description: input.description?.trim() || "",
      icon: input.icon || "star",
      color: input.color || "#0F766E",
      earn_hint: input.earnHint?.trim() || "",
    })
    .select(
      "id, customer_app_id, code, name, description, icon, color, earn_hint, is_active, sort_order"
    )
    .single();
  if (error) throw new Error(error.message);
  return data as PointType;
}

export async function updatePointType(
  id: string,
  customerAppId: string,
  patch: Partial<{
    name: string;
    description: string;
    icon: string;
    color: string;
    earn_hint: string;
    is_active: boolean;
  }>
): Promise<void> {
  const admin = caAdmin();
  const { error } = await admin
    .from("customer_app_point_types")
    .update(patch)
    .eq("id", id)
    .eq("customer_app_id", customerAppId);
  if (error) throw new Error(error.message);
}

export async function deletePointType(id: string, customerAppId: string): Promise<void> {
  const admin = caAdmin();
  const { error } = await admin
    .from("customer_app_point_types")
    .delete()
    .eq("id", id)
    .eq("customer_app_id", customerAppId);
  if (error) throw new Error(error.message);
}

export async function listLeaderboardTiers(customerAppId: string) {
  const admin = caAdmin();
  const { data, error } = await admin
    .from("customer_app_leaderboard_tiers")
    .select(
      "id, customer_app_id, rank, title, description, reward_kind, reward_image_url, service_id, app_product_id, custom_reward_label"
    )
    .eq("customer_app_id", customerAppId)
    .order("rank");
  if (error) throw new Error(error.message);
  return (data ?? []) as LeaderboardTier[];
}

export async function ensureDefaultLeaderboardTiers(customerAppId: string) {
  const existing = await listLeaderboardTiers(customerAppId);
  if (existing.length >= 3) return existing;
  const admin = caAdmin();
  const defaults = [
    { rank: 1, title: "1st place", description: "Top ranked client", custom_reward_label: "Champion reward" },
    { rank: 2, title: "2nd place", description: "Runner-up", custom_reward_label: "Silver reward" },
    { rank: 3, title: "3rd place", description: "Third place", custom_reward_label: "Bronze reward" },
  ];
  for (const d of defaults) {
    if (existing.some((e) => e.rank === d.rank)) continue;
    await admin.from("customer_app_leaderboard_tiers").insert({
      customer_app_id: customerAppId,
      ...d,
      reward_kind: "custom",
    });
  }
  return listLeaderboardTiers(customerAppId);
}

export async function upsertLeaderboardTier(input: {
  customerAppId: string;
  rank: number;
  title: string;
  description?: string;
  rewardKind: "service" | "product" | "custom";
  rewardImageUrl?: string | null;
  serviceId?: string | null;
  appProductId?: string | null;
  customRewardLabel?: string;
}): Promise<void> {
  const admin = caAdmin();
  const { error } = await admin.from("customer_app_leaderboard_tiers").upsert(
    {
      customer_app_id: input.customerAppId,
      rank: input.rank,
      title: input.title.trim(),
      description: input.description?.trim() || "",
      reward_kind: input.rewardKind,
      reward_image_url: input.rewardImageUrl?.trim() || null,
      service_id: input.rewardKind === "service" ? input.serviceId || null : null,
      app_product_id: input.rewardKind === "product" ? input.appProductId || null : null,
      custom_reward_label:
        input.rewardKind === "custom" ? input.customRewardLabel?.trim() || "" : "",
    },
    { onConflict: "customer_app_id,rank" }
  );
  if (error) throw new Error(error.message);
}

export type PointsLedgerRow = {
  id: string;
  delta_points: number;
  balance_after: number;
  reason: string;
  point_type_id: string | null;
  customer_phone: string;
  app_customer_id: string | null;
  created_at: string;
  reference_type: string | null;
  reference_id: string | null;
};

export async function getPointsHistory(input: {
  customerAppId: string;
  phone?: string;
  appCustomerId?: string;
  limit?: number;
}): Promise<PointsLedgerRow[]> {
  const admin = caAdmin();
  let q = admin
    .from("customer_app_loyalty_ledger")
    .select(
      "id, delta_points, balance_after, reason, point_type_id, customer_phone, app_customer_id, created_at, reference_type, reference_id"
    )
    .eq("customer_app_id", input.customerAppId)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 100);
  if (input.appCustomerId) q = q.eq("app_customer_id", input.appCustomerId);
  if (input.phone) q = q.eq("customer_phone", normalizePhone(input.phone));
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as PointsLedgerRow[];
}

export async function awardTypedPoints(input: {
  customerAppId: string;
  organizationId: string;
  phone: string;
  pointTypeId: string;
  delta: number;
  reason: string;
  idempotencyKey: string;
  appCustomerId?: string | null;
}): Promise<{ balance: number; awarded: boolean }> {
  const admin = caAdmin();
  const phone = normalizePhone(input.phone);
  const history = await getPointsHistory({
    customerAppId: input.customerAppId,
    phone,
    limit: 1,
  });
  // Balance for this phone overall (latest balance_after)
  const currentBalance = history[0] ? Number(history[0].balance_after) : 0;
  const balanceAfter = currentBalance + input.delta;
  const { error } = await admin.from("customer_app_loyalty_ledger").insert({
    customer_app_id: input.customerAppId,
    organization_id: input.organizationId,
    customer_phone: phone,
    app_customer_id: input.appCustomerId ?? null,
    point_type_id: input.pointTypeId,
    delta_points: input.delta,
    balance_after: balanceAfter,
    reason: input.reason,
    idempotency_key: input.idempotencyKey,
  });
  if (error) {
    if (error.code === "23505") {
      const again = await getPointsHistory({
        customerAppId: input.customerAppId,
        phone,
        limit: 1,
      });
      return {
        balance: again[0] ? Number(again[0].balance_after) : currentBalance,
        awarded: false,
      };
    }
    throw new Error(error.message);
  }
  return { balance: balanceAfter, awarded: true };
}
