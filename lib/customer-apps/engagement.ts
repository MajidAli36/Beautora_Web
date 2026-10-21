import { caAdmin } from "@/lib/customer-apps/admin";

export type LoyaltyRules = {
  enabled: boolean;
  points_per_currency: number;
  points_per_completed_booking: number;
  points_per_product_purchase: number;
  welcome_bonus_points: number;
  redeem_points_per_currency: number;
  min_redeem_points: number;
  expiry_days: number | null;
  show_on_customer_app: boolean;
  rules_note: string;
};

export type LeaderboardRules = {
  enabled: boolean;
  title: string;
  metric: "points" | "bookings" | "spend";
  window_days: number;
  top_n: number;
  show_display_name: boolean;
  show_on_customer_app: boolean;
  rules_note: string;
};

export type CustomerAppReel = {
  id: string;
  customer_app_id: string;
  organization_id: string;
  title: string;
  caption: string;
  video_url: string;
  poster_url: string | null;
  product_id: string | null;
  service_id: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
};

export const DEFAULT_LOYALTY_RULES: LoyaltyRules = {
  enabled: false,
  points_per_currency: 1,
  points_per_completed_booking: 10,
  points_per_product_purchase: 5,
  welcome_bonus_points: 0,
  redeem_points_per_currency: 100,
  min_redeem_points: 100,
  expiry_days: null,
  show_on_customer_app: true,
  rules_note: "Earn points on completed bookings and product purchases.",
};

export const DEFAULT_LEADERBOARD_RULES: LeaderboardRules = {
  enabled: false,
  title: "Top clients",
  metric: "points",
  window_days: 30,
  top_n: 10,
  show_display_name: true,
  show_on_customer_app: true,
  rules_note: "Rankings reset on the selected time window.",
};

export async function getLoyaltyRules(customerAppId: string): Promise<LoyaltyRules> {
  const admin = caAdmin();
  const { data } = await admin
    .from("customer_app_loyalty_rules")
    .select("*")
    .eq("customer_app_id", customerAppId)
    .maybeSingle();
  if (!data) return { ...DEFAULT_LOYALTY_RULES };
  return {
    enabled: Boolean(data.enabled),
    points_per_currency: Number(data.points_per_currency),
    points_per_completed_booking: Number(data.points_per_completed_booking),
    points_per_product_purchase: Number(data.points_per_product_purchase),
    welcome_bonus_points: Number(data.welcome_bonus_points),
    redeem_points_per_currency: Number(data.redeem_points_per_currency),
    min_redeem_points: Number(data.min_redeem_points),
    expiry_days: data.expiry_days == null ? null : Number(data.expiry_days),
    show_on_customer_app: Boolean(data.show_on_customer_app),
    rules_note: String(data.rules_note ?? ""),
  };
}

export async function upsertLoyaltyRules(
  customerAppId: string,
  actorUserId: string,
  rules: LoyaltyRules
): Promise<void> {
  const admin = caAdmin();
  const { error } = await admin.from("customer_app_loyalty_rules").upsert(
    {
      customer_app_id: customerAppId,
      ...rules,
      updated_by: actorUserId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "customer_app_id" }
  );
  if (error) throw new Error(error.message);

  // Mirror feature flag on app features + draft settings features
  await admin.from("customer_app_features").upsert(
    {
      customer_app_id: customerAppId,
      feature_key: "loyalty",
      enabled: rules.enabled,
      state: rules.enabled ? "published" : "disabled",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "customer_app_id,feature_key" }
  );
}

export async function getLeaderboardRules(
  customerAppId: string
): Promise<LeaderboardRules> {
  const admin = caAdmin();
  const { data } = await admin
    .from("customer_app_leaderboard_rules")
    .select("*")
    .eq("customer_app_id", customerAppId)
    .maybeSingle();
  if (!data) return { ...DEFAULT_LEADERBOARD_RULES };
  return {
    enabled: Boolean(data.enabled),
    title: String(data.title || "Top clients"),
    metric: (data.metric as LeaderboardRules["metric"]) || "points",
    window_days: Number(data.window_days) || 30,
    top_n: Number(data.top_n) || 10,
    show_display_name: Boolean(data.show_display_name),
    show_on_customer_app: Boolean(data.show_on_customer_app),
    rules_note: String(data.rules_note ?? ""),
  };
}

export async function upsertLeaderboardRules(
  customerAppId: string,
  actorUserId: string,
  rules: LeaderboardRules
): Promise<void> {
  const admin = caAdmin();
  const { error } = await admin.from("customer_app_leaderboard_rules").upsert(
    {
      customer_app_id: customerAppId,
      ...rules,
      updated_by: actorUserId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "customer_app_id" }
  );
  if (error) throw new Error(error.message);

  await admin.from("customer_app_features").upsert(
    {
      customer_app_id: customerAppId,
      feature_key: "leaderboard",
      enabled: rules.enabled,
      state: rules.enabled ? "published" : "disabled",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "customer_app_id,feature_key" }
  );
}

export async function listReelsForApp(
  customerAppId: string,
  opts?: { publishedOnly?: boolean }
): Promise<CustomerAppReel[]> {
  const admin = caAdmin();
  let q = admin
    .from("customer_app_reels")
    .select(
      "id, customer_app_id, organization_id, title, caption, video_url, poster_url, product_id, service_id, sort_order, is_published, created_at"
    )
    .eq("customer_app_id", customerAppId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (opts?.publishedOnly) q = q.eq("is_published", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as CustomerAppReel[];
}

export async function createReel(input: {
  customerAppId: string;
  organizationId: string;
  actorUserId: string;
  title: string;
  caption: string;
  videoUrl: string;
  posterUrl?: string | null;
  productId?: string | null;
  isPublished?: boolean;
}): Promise<CustomerAppReel> {
  const admin = caAdmin();
  const { data, error } = await admin
    .from("customer_app_reels")
    .insert({
      customer_app_id: input.customerAppId,
      organization_id: input.organizationId,
      title: input.title.trim(),
      caption: input.caption.trim(),
      video_url: input.videoUrl.trim(),
      poster_url: input.posterUrl?.trim() || null,
      product_id: input.productId || null,
      is_published: input.isPublished ?? true,
      created_by: input.actorUserId,
    })
    .select(
      "id, customer_app_id, organization_id, title, caption, video_url, poster_url, product_id, service_id, sort_order, is_published, created_at"
    )
    .single();
  if (error) throw new Error(error.message);
  return data as CustomerAppReel;
}

export async function setReelPublished(
  reelId: string,
  customerAppId: string,
  isPublished: boolean
): Promise<void> {
  const admin = caAdmin();
  const { error } = await admin
    .from("customer_app_reels")
    .update({ is_published: isPublished })
    .eq("id", reelId)
    .eq("customer_app_id", customerAppId);
  if (error) throw new Error(error.message);
}

export async function deleteReel(reelId: string, customerAppId: string): Promise<void> {
  const admin = caAdmin();
  const { error } = await admin
    .from("customer_app_reels")
    .delete()
    .eq("id", reelId)
    .eq("customer_app_id", customerAppId);
  if (error) throw new Error(error.message);
}

export async function getLoyaltyBalance(
  customerAppId: string,
  phone: string
): Promise<{ balance: number; recent: { delta_points: number; reason: string; created_at: string }[] }> {
  const admin = caAdmin();
  const normalized = phone.replace(/[^\d+]/g, "");
  const { data } = await admin
    .from("customer_app_loyalty_ledger")
    .select("delta_points, reason, created_at, balance_after")
    .eq("customer_app_id", customerAppId)
    .eq("customer_phone", normalized)
    .order("created_at", { ascending: false })
    .limit(20);
  const latest = data?.[0];
  return {
    balance: latest ? Number(latest.balance_after) : 0,
    recent: (data ?? []).map((r) => ({
      delta_points: Number(r.delta_points),
      reason: String(r.reason),
      created_at: String(r.created_at),
    })),
  };
}

/** Award points once per idempotency key (safe for retries). */
export async function awardLoyaltyPoints(input: {
  customerAppId: string;
  organizationId: string;
  phone: string;
  delta: number;
  reason: string;
  idempotencyKey: string;
  referenceType?: string;
  referenceId?: string;
  customerId?: string | null;
}): Promise<{ balance: number; awarded: boolean }> {
  if (input.delta === 0) {
    const bal = await getLoyaltyBalance(input.customerAppId, input.phone);
    return { balance: bal.balance, awarded: false };
  }
  const admin = caAdmin();
  const phone = input.phone.replace(/[^\d+]/g, "");
  const current = await getLoyaltyBalance(input.customerAppId, phone);
  const balanceAfter = current.balance + input.delta;
  const { error } = await admin.from("customer_app_loyalty_ledger").insert({
    customer_app_id: input.customerAppId,
    organization_id: input.organizationId,
    customer_phone: phone,
    customer_id: input.customerId ?? null,
    delta_points: input.delta,
    balance_after: balanceAfter,
    reason: input.reason,
    reference_type: input.referenceType ?? null,
    reference_id: input.referenceId ?? null,
    idempotency_key: input.idempotencyKey,
  });
  if (error) {
    if (error.code === "23505") {
      const bal = await getLoyaltyBalance(input.customerAppId, phone);
      return { balance: bal.balance, awarded: false };
    }
    throw new Error(error.message);
  }
  return { balance: balanceAfter, awarded: true };
}

export async function computeLeaderboard(
  customerAppId: string,
  organizationIds: string[],
  rules: LeaderboardRules
): Promise<{ rank: number; displayName: string; score: number }[]> {
  if (!rules.enabled || !rules.show_on_customer_app) return [];
  const admin = caAdmin();
  const since = new Date();
  since.setDate(since.getDate() - rules.window_days);
  const sinceIso = since.toISOString();

  if (rules.metric === "points") {
    const { data } = await admin
      .from("customer_app_loyalty_ledger")
      .select("customer_phone, delta_points")
      .eq("customer_app_id", customerAppId)
      .gte("created_at", sinceIso)
      .limit(5000);
    const map = new Map<string, number>();
    for (const row of data ?? []) {
      const phone = String(row.customer_phone);
      map.set(phone, (map.get(phone) ?? 0) + Number(row.delta_points));
    }
    return [...map.entries()]
      .map(([phone, score]) => ({ phone, score }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, rules.top_n)
      .map((r, i) => ({
        rank: i + 1,
        displayName: rules.show_display_name ? maskPhone(r.phone) : `Guest ${i + 1}`,
        score: r.score,
      }));
  }

  const { data: appts } = await admin
    .from("appointments")
    .select("customer_id, status")
    .in("organization_id", organizationIds)
    .eq("status", "COMPLETED")
    .gte("scheduled_at", sinceIso)
    .is("deleted_at", null)
    .limit(5000);

  const counts = new Map<string, number>();
  for (const a of appts ?? []) {
    if (!a.customer_id) continue;
    counts.set(a.customer_id, (counts.get(a.customer_id) ?? 0) + 1);
  }
  const customerIds = [...counts.keys()];
  if (!customerIds.length) return [];

  const { data: customers } = await admin
    .from("customers")
    .select("id, first_name, last_name, phone")
    .in("id", customerIds);

  const nameById = new Map(
    (customers ?? []).map((c) => [
      c.id,
      rules.show_display_name
        ? `${c.first_name}${c.last_name ? ` ${c.last_name[0]}.` : ""}`.trim()
        : "Guest",
    ])
  );

  return [...counts.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, rules.top_n)
    .map((r, i) => ({
      rank: i + 1,
      displayName: nameById.get(r.id) || `Guest ${i + 1}`,
      score: r.score,
    }));
}

function maskPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length < 4) return "Client";
  return `•••${d.slice(-4)}`;
}

export async function setProductCatalogFeature(
  customerAppId: string,
  enabled: boolean
): Promise<void> {
  const admin = caAdmin();
  await admin.from("customer_app_features").upsert(
    {
      customer_app_id: customerAppId,
      feature_key: "product_catalog",
      enabled,
      state: enabled ? "published" : "disabled",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "customer_app_id,feature_key" }
  );
}

export async function listOrgRetailProducts(organizationId: string) {
  const admin = caAdmin();
  const { data } = await admin
    .from("products")
    .select(
      "id, name, description, retail_price, stock_quantity, product_kind, is_active, sku"
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("name")
    .limit(500);
  return data ?? [];
}

export async function setProductVisibility(
  customerAppId: string,
  organizationId: string,
  productId: string,
  visible: boolean
): Promise<void> {
  const admin = caAdmin();
  const { error } = await admin.from("customer_app_product_visibility").upsert(
    {
      customer_app_id: customerAppId,
      organization_id: organizationId,
      product_id: productId,
      visible,
    },
    { onConflict: "customer_app_id,product_id" }
  );
  if (error) throw new Error(error.message);
}

export async function listProductVisibility(customerAppId: string) {
  const admin = caAdmin();
  const { data } = await admin
    .from("customer_app_product_visibility")
    .select("product_id, visible")
    .eq("customer_app_id", customerAppId);
  return new Map((data ?? []).map((r) => [r.product_id as string, Boolean(r.visible)]));
}
