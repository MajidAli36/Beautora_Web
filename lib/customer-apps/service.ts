import { unstable_cache, updateTag } from "next/cache";
import { caAdmin } from "@/lib/customer-apps/admin";
import { defaultCustomerAppSettings, slugifyAppSlug } from "@/lib/customer-apps/defaults";
import {
  CUSTOMER_APP_FEATURE_KEYS,
  blocksCustomerApi,
  type CustomerAppFeatureKey,
  type CustomerAppListItem,
  type CustomerAppRow,
  type CustomerAppSettings,
  type CustomerAppStatus,
} from "@/lib/customer-apps/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export function customerAppPublishedCacheTag(slug: string) {
  return `customer-app-published:${slug.trim().toLowerCase()}`;
}

export function customerAppByOrgCacheTag(organizationId: string) {
  return `customer-app-by-org:${organizationId}`;
}

export function invalidateCustomerAppPublishedCache(slug: string) {
  updateTag(customerAppPublishedCacheTag(slug));
}

export function invalidateCustomerAppByOrgCache(organizationId: string) {
  updateTag(customerAppByOrgCacheTag(organizationId));
}

type Admin = SupabaseClient;

function asSettings(raw: unknown): CustomerAppSettings {
  const base = defaultCustomerAppSettings({ orgName: "Salon" });
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<CustomerAppSettings>;
  return {
    branding: { ...base.branding, ...(o.branding ?? {}) },
    experience: { ...base.experience, ...(o.experience ?? {}) },
    features: { ...base.features, ...(o.features ?? {}) },
  };
}

async function audit(
  admin: Admin,
  customerAppId: string,
  actorUserId: string | null,
  action: string,
  detail: Record<string, unknown> = {}
) {
  await admin.from("customer_app_audit_logs").insert({
    customer_app_id: customerAppId,
    actor_user_id: actorUserId,
    action,
    detail,
  });
}

export async function listCustomerApps(): Promise<CustomerAppListItem[]> {
  const admin = caAdmin();
  const { data: apps, error } = await admin
    .from("customer_apps")
    .select(
      "id, organization_id, slug, display_name, status, enabled_at, published_at, suspended_at, deactivated_at, created_at, updated_at"
    )
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);

  const orgIds = [...new Set((apps ?? []).map((a) => a.organization_id))];
  const [{ data: orgs }, { data: features }, { data: salons }] = await Promise.all([
    orgIds.length
      ? admin.from("organizations").select("id, name, slug").in("id", orgIds)
      : Promise.resolve({ data: [] as { id: string; name: string; slug: string }[] }),
    (apps ?? []).length
      ? admin
          .from("customer_app_features")
          .select("customer_app_id, enabled")
          .in(
            "customer_app_id",
            (apps ?? []).map((a) => a.id)
          )
      : Promise.resolve({ data: [] as { customer_app_id: string; enabled: boolean }[] }),
    (apps ?? []).length
      ? admin
          .from("customer_app_salons")
          .select("customer_app_id")
          .eq("status", "active")
          .in(
            "customer_app_id",
            (apps ?? []).map((a) => a.id)
          )
      : Promise.resolve({ data: [] as { customer_app_id: string }[] }),
  ]);

  const orgMap = new Map((orgs ?? []).map((o) => [o.id, o]));
  const featureCount = new Map<string, number>();
  for (const f of features ?? []) {
    if (!f.enabled) continue;
    featureCount.set(f.customer_app_id, (featureCount.get(f.customer_app_id) ?? 0) + 1);
  }
  const salonCount = new Map<string, number>();
  for (const s of salons ?? []) {
    salonCount.set(s.customer_app_id, (salonCount.get(s.customer_app_id) ?? 0) + 1);
  }

  return (apps ?? []).map((a) => {
    const org = orgMap.get(a.organization_id);
    return {
      ...(a as CustomerAppRow),
      organizationName: org?.name ?? "Unknown",
      organizationSlug: org?.slug ?? "",
      featureEnabledCount: featureCount.get(a.id) ?? 0,
      salonCount: 1 + (salonCount.get(a.id) ?? 0),
    };
  });
}

async function getCustomerAppByOrgUncached(
  organizationId: string
): Promise<CustomerAppRow | null> {
  const admin = caAdmin();
  const { data } = await admin
    .from("customer_apps")
    .select(
      "id, organization_id, slug, display_name, status, enabled_at, published_at, suspended_at, deactivated_at, created_at, updated_at"
    )
    .eq("organization_id", organizationId)
    .maybeSingle();
  return (data as CustomerAppRow | null) ?? null;
}

/** Hot path (app layout / mode switch) — short TTL, tag-invalidated on status changes. */
export async function getCustomerAppByOrg(
  organizationId: string
): Promise<CustomerAppRow | null> {
  if (!organizationId) return null;
  return unstable_cache(
    () => getCustomerAppByOrgUncached(organizationId),
    ["customer-app-by-org", organizationId],
    {
      revalidate: 60,
      tags: [customerAppByOrgCacheTag(organizationId)],
    }
  )();
}

export async function getCustomerAppBySlug(slug: string): Promise<CustomerAppRow | null> {
  const admin = caAdmin();
  const { data } = await admin
    .from("customer_apps")
    .select(
      "id, organization_id, slug, display_name, status, enabled_at, published_at, suspended_at, deactivated_at, created_at, updated_at"
    )
    .eq("slug", slug)
    .maybeSingle();
  return (data as CustomerAppRow | null) ?? null;
}

export async function getCustomerAppById(id: string): Promise<CustomerAppRow | null> {
  const admin = caAdmin();
  const { data } = await admin
    .from("customer_apps")
    .select(
      "id, organization_id, slug, display_name, status, enabled_at, published_at, suspended_at, deactivated_at, created_at, updated_at"
    )
    .eq("id", id)
    .maybeSingle();
  return (data as CustomerAppRow | null) ?? null;
}

export async function getAppConfigBundle(customerAppId: string): Promise<{
  draft: CustomerAppSettings;
  published: CustomerAppSettings | null;
  draftUpdatedAt: string | null;
  publishedAt: string | null;
}> {
  const admin = caAdmin();
  const { data } = await admin
    .from("customer_app_configs")
    .select("draft, published, draft_updated_at, published_at")
    .eq("customer_app_id", customerAppId)
    .maybeSingle();
  return {
    draft: asSettings(data?.draft),
    published: data?.published ? asSettings(data.published) : null,
    draftUpdatedAt: data?.draft_updated_at ?? null,
    publishedAt: data?.published_at ?? null,
  };
}

async function ensureUniqueSlug(admin: Admin, base: string, excludeId?: string) {
  let slug = slugifyAppSlug(base);
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    let q = admin.from("customer_apps").select("id").eq("slug", candidate).limit(1);
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q.maybeSingle();
    if (!data) return candidate;
  }
  return `${slug}-${Date.now().toString(36)}`;
}

/** Super Admin: first-time enable creates app + draft config + default features. */
export async function enableCustomerAppForOrg(input: {
  organizationId: string;
  actorUserId: string;
  appName?: string;
  slug?: string;
}): Promise<CustomerAppRow> {
  const admin = caAdmin();
  const existing = await getCustomerAppByOrg(input.organizationId);
  if (existing) {
    if (existing.status === "deactivated" || existing.status === "suspended") {
      const { data, error } = await admin
        .from("customer_apps")
        .update({
          status: "setup_required",
          suspended_at: null,
          deactivated_at: null,
          enabled_by: input.actorUserId,
          enabled_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select(
          "id, organization_id, slug, display_name, status, enabled_at, published_at, suspended_at, deactivated_at, created_at, updated_at"
        )
        .single();
      if (error) throw new Error(error.message);
      await audit(admin, existing.id, input.actorUserId, "re_enabled");
      return data as CustomerAppRow;
    }
    return existing;
  }

  const { data: org } = await admin
    .from("organizations")
    .select("id, name, slug")
    .eq("id", input.organizationId)
    .single();
  if (!org) throw new Error("Organization not found");

  const settings = defaultCustomerAppSettings({
    orgName: org.name,
    appName: input.appName,
  });
  const slug = await ensureUniqueSlug(admin, input.slug ?? org.slug ?? org.name);

  const { data: app, error } = await admin
    .from("customer_apps")
    .insert({
      organization_id: org.id,
      slug,
      display_name: settings.branding.appName,
      status: "setup_required",
      enabled_by: input.actorUserId,
      enabled_at: new Date().toISOString(),
    })
    .select(
      "id, organization_id, slug, display_name, status, enabled_at, published_at, suspended_at, deactivated_at, created_at, updated_at"
    )
    .single();
  if (error) throw new Error(error.message);

  const { error: cfgErr } = await admin.from("customer_app_configs").insert({
    customer_app_id: app.id,
    draft: settings,
    draft_updated_by: input.actorUserId,
  });
  if (cfgErr) throw new Error(cfgErr.message);

  const featureRows = CUSTOMER_APP_FEATURE_KEYS.map((feature_key) => ({
    customer_app_id: app.id,
    feature_key,
    enabled: Boolean(settings.features[feature_key as CustomerAppFeatureKey]),
    state: settings.features[feature_key as CustomerAppFeatureKey]
      ? ("approved" as const)
      : ("disabled" as const),
  }));
  const { error: featErr } = await admin.from("customer_app_features").insert(featureRows);
  if (featErr) throw new Error(featErr.message);

  await admin.from("customer_app_salons").insert({
    customer_app_id: app.id,
    organization_id: org.id,
    status: "active",
    assigned_by: input.actorUserId,
  });

  await audit(admin, app.id, input.actorUserId, "enabled", { slug });
  return app as CustomerAppRow;
}

export async function saveDraftSettings(input: {
  customerAppId: string;
  actorUserId: string;
  settings: CustomerAppSettings;
  displayName?: string;
}): Promise<void> {
  const admin = caAdmin();
  const { error } = await admin
    .from("customer_app_configs")
    .update({
      draft: input.settings,
      draft_updated_at: new Date().toISOString(),
      draft_updated_by: input.actorUserId,
    })
    .eq("customer_app_id", input.customerAppId);
  if (error) throw new Error(error.message);

  if (input.displayName?.trim()) {
    await admin
      .from("customer_apps")
      .update({ display_name: input.displayName.trim() })
      .eq("id", input.customerAppId);
  }

  await audit(admin, input.customerAppId, input.actorUserId, "draft_saved");
}

export async function publishCustomerApp(input: {
  customerAppId: string;
  actorUserId: string;
}): Promise<void> {
  const admin = caAdmin();
  const existing = await getCustomerAppById(input.customerAppId);
  const cfg = await getAppConfigBundle(input.customerAppId);
  const { error: cfgErr } = await admin
    .from("customer_app_configs")
    .update({
      published: cfg.draft,
      published_at: new Date().toISOString(),
      published_by: input.actorUserId,
    })
    .eq("customer_app_id", input.customerAppId);
  if (cfgErr) throw new Error(cfgErr.message);

  const { error } = await admin
    .from("customer_apps")
    .update({
      status: "published" satisfies CustomerAppStatus,
      published_at: new Date().toISOString(),
      suspended_at: null,
      deactivated_at: null,
      display_name: cfg.draft.branding.appName,
    })
    .eq("id", input.customerAppId);
  if (error) throw new Error(error.message);

  await audit(admin, input.customerAppId, input.actorUserId, "published");
  if (existing?.slug) invalidateCustomerAppPublishedCache(existing.slug);
  if (existing?.organization_id) {
    invalidateCustomerAppByOrgCache(existing.organization_id);
  }
}

export async function setCustomerAppStatus(input: {
  customerAppId: string;
  actorUserId: string;
  status: Extract<CustomerAppStatus, "suspended" | "deactivated" | "setup_required" | "approved">;
}): Promise<void> {
  const admin = caAdmin();
  const existing = await getCustomerAppById(input.customerAppId);
  const patch: Record<string, unknown> = { status: input.status };
  if (input.status === "suspended") patch.suspended_at = new Date().toISOString();
  if (input.status === "deactivated") patch.deactivated_at = new Date().toISOString();
  if (input.status === "setup_required" || input.status === "approved") {
    patch.suspended_at = null;
    patch.deactivated_at = null;
  }
  const { error } = await admin
    .from("customer_apps")
    .update(patch)
    .eq("id", input.customerAppId);
  if (error) throw new Error(error.message);
  await audit(admin, input.customerAppId, input.actorUserId, "status_changed", {
    status: input.status,
  });
  if (existing?.slug) invalidateCustomerAppPublishedCache(existing.slug);
}

type PublishedAppContext =
  | {
      app: CustomerAppRow;
      settings: CustomerAppSettings;
      organizationIds: string[];
    }
  | { error: string; status: number };

async function loadPublishedAppContextUncached(slug: string): Promise<PublishedAppContext> {
  const app = await getCustomerAppBySlug(slug);
  if (!app) return { error: "App not found", status: 404 };
  if (blocksCustomerApi(app.status)) {
    return { error: `App is ${app.status}`, status: 403 };
  }

  const admin = caAdmin();
  const [cfg, salonsRes] = await Promise.all([
    getAppConfigBundle(app.id),
    admin
      .from("customer_app_salons")
      .select("organization_id")
      .eq("customer_app_id", app.id)
      .eq("status", "active"),
  ]);

  if (!cfg.published) return { error: "App has no published config", status: 403 };

  const organizationIds = [
    ...new Set([
      app.organization_id,
      ...((salonsRes.data ?? []) as { organization_id: string }[]).map(
        (s) => s.organization_id
      ),
    ]),
  ];

  return { app, settings: cfg.published, organizationIds };
}

/** Published customer-app context — cached ~60s, invalidated on publish/suspend. */
export async function resolvePublishedAppContext(
  slug: string
): Promise<PublishedAppContext> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return { error: "Missing app slug", status: 400 };

  return unstable_cache(
    () => loadPublishedAppContextUncached(normalized),
    ["customer-app-published", normalized],
    {
      revalidate: 60,
      tags: [customerAppPublishedCacheTag(normalized)],
    }
  )();
}
