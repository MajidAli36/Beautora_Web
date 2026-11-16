"use server";

import { revalidatePath } from "next/cache";
import { requireOrganization } from "@/lib/auth/organization";
import { getSession } from "@/lib/auth/session";
import { hasMinimumRole } from "@/lib/permissions/roles";
import { readinessChecklist } from "@/lib/customer-apps/defaults";
import {
  createReel,
  deleteReel,
  getLeaderboardRules,
  getLoyaltyRules,
  listOrgRetailProducts,
  listProductVisibility,
  listReelsForApp,
  setProductCatalogFeature,
  setProductVisibility,
  setReelPublished,
  upsertLeaderboardRules,
  upsertLoyaltyRules,
  type LeaderboardRules,
  type LoyaltyRules,
} from "@/lib/customer-apps/engagement";
import {
  getAppConfigBundle,
  getCustomerAppByOrg,
  publishCustomerApp,
  saveDraftSettings,
} from "@/lib/customer-apps/service";
import type { CustomerAppSettings } from "@/lib/customer-apps/types";
import type { ActionResult } from "@/types/commerce";
import { caAdmin } from "@/lib/customer-apps/admin";

/** Salon OWNER/ADMIN = client admin for their org's customer app. */
async function requireSalonAppAdmin() {
  const org = await requireOrganization();
  if (!hasMinimumRole(org.role, "ADMIN")) {
    throw new Error("Only salon owners/admins can manage the customer app");
  }
  const user = await getSession();
  if (!user) throw new Error("Unauthorized");
  return { org, user };
}

async function requireEnabledApp() {
  const ctx = await requireSalonAppAdmin();
  const app = await getCustomerAppByOrg(ctx.org.organizationId);
  if (!app) throw new Error("Customer app is not enabled. Ask Super Admin to enable it.");
  if (app.status === "deactivated" || app.status === "suspended") {
    throw new Error(`App is ${app.status}. Contact Super Admin.`);
  }
  return { ...ctx, app };
}

export async function getSalonCustomerAppDashboard() {
  const { org } = await requireSalonAppAdmin();
  const app = await getCustomerAppByOrg(org.organizationId);
  if (!app) {
    return {
      app: null,
      config: null,
      checklist: [] as ReturnType<typeof readinessChecklist>,
      loyalty: null,
      leaderboard: null,
      reels: [],
      products: [],
      productVisibility: {} as Record<string, boolean>,
      appCustomers: [],
      appBookings: [],
      appProducts: [],
      appDeals: [],
      pointTypes: [],
      leaderboardTiers: [],
      pointsHistory: [],
      notifications: [],
      services: [] as { id: string; name: string }[],
    };
  }

  const {
    ensureDefaultPointType,
    ensureDefaultLeaderboardTiers,
    listAppCustomers,
    listAppBookings,
    listAppProducts,
    listAppDeals,
    listPointTypes,
    listLeaderboardTiers,
    getPointsHistory,
  } = await import("@/lib/customer-apps/domain");

  await Promise.all([
    ensureDefaultPointType(app.id),
    ensureDefaultLeaderboardTiers(app.id),
  ]);

  const [
    config,
    loyalty,
    leaderboard,
    reels,
    products,
    visMap,
    appCustomers,
    appBookings,
    appProducts,
    appDeals,
    pointTypes,
    leaderboardTiers,
    servicesRes,
    pointsHistory,
    notifications,
  ] = await Promise.all([
    getAppConfigBundle(app.id),
    getLoyaltyRules(app.id),
    getLeaderboardRules(app.id),
    listReelsForApp(app.id),
    listOrgRetailProducts(org.organizationId),
    listProductVisibility(app.id),
    listAppCustomers(app.id),
    listAppBookings(app.id),
    listAppProducts(app.id),
    listAppDeals(app.id),
    listPointTypes(app.id),
    listLeaderboardTiers(app.id),
    caAdmin()
      .from("services")
      .select("id, name")
      .eq("organization_id", org.organizationId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("name")
      .limit(200),
    getPointsHistory({ customerAppId: app.id, limit: 40 }),
    import("@/lib/customer-apps/notifications").then((m) =>
      m.listNotificationsForApp(app.id).catch(() => [])
    ),
  ]);

  const productVisibility: Record<string, boolean> = {};
  for (const [id, v] of visMap) productVisibility[id] = v;

  return {
    app,
    config,
    checklist: readinessChecklist(config.draft),
    loyalty,
    leaderboard,
    reels,
    products,
    productVisibility,
    appCustomers,
    appBookings,
    appProducts,
    appDeals,
    pointTypes,
    leaderboardTiers,
    pointsHistory,
    notifications,
    services: (servicesRes.data ?? []) as { id: string; name: string }[],
  };
}

export async function salonSaveCustomerAppDraft(
  settings: CustomerAppSettings
): Promise<ActionResult> {
  try {
    const { app, user } = await requireEnabledApp();
    await saveDraftSettings({
      customerAppId: app.id,
      actorUserId: user.id,
      settings,
      displayName: settings.branding.appName,
    });
    revalidatePath("/customer-app");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Save failed" };
  }
}

export async function salonPublishCustomerApp(): Promise<ActionResult> {
  try {
    const { app, user } = await requireEnabledApp();
    const config = await getAppConfigBundle(app.id);
    const failed = readinessChecklist(config.draft).filter((c) => !c.ok);
    if (failed.length) {
      return { error: `Not ready: ${failed.map((f) => f.label).join(", ")}` };
    }
    await publishCustomerApp({ customerAppId: app.id, actorUserId: user.id });
    revalidatePath("/customer-app");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Publish failed" };
  }
}

async function syncFeatureOnDraftAndLive(
  customerAppId: string,
  actorUserId: string,
  feature: "loyalty" | "leaderboard" | "product_catalog" | "notifications",
  enabled: boolean,
  appStatus: string
) {
  const config = await getAppConfigBundle(customerAppId);
  const nextDraft = {
    ...config.draft,
    features: { ...config.draft.features, [feature]: enabled },
  };
  await saveDraftSettings({
    customerAppId,
    actorUserId,
    settings: nextDraft,
  });
  // If already live, patch published features too so mobile sees toggles without a full republish
  if (appStatus === "published" && config.published) {
    const admin = caAdmin();
    await admin
      .from("customer_app_configs")
      .update({
        published: {
          ...config.published,
          features: { ...config.published.features, [feature]: enabled },
        },
      })
      .eq("customer_app_id", customerAppId);
  }
}

export async function salonSaveLoyaltyRules(rules: LoyaltyRules): Promise<ActionResult> {
  try {
    const { app, user } = await requireEnabledApp();
    await upsertLoyaltyRules(app.id, user.id, rules);
    await syncFeatureOnDraftAndLive(
      app.id,
      user.id,
      "loyalty",
      rules.enabled,
      app.status
    );
    revalidatePath("/customer-app");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save points rules" };
  }
}

export async function salonCreateNotification(input: {
  title: string;
  body: string;
  kind?: "announcement" | "promo" | "rules" | "reminder";
  publish?: boolean;
}): Promise<ActionResult> {
  try {
    const { app, user, org } = await requireEnabledApp();
    const { createNotification } = await import("@/lib/customer-apps/notifications");
    await createNotification({
      customerAppId: app.id,
      organizationId: org.organizationId,
      actorUserId: user.id,
      title: input.title,
      body: input.body,
      kind: input.kind,
      publish: input.publish ?? true,
    });
    await syncFeatureOnDraftAndLive(
      app.id,
      user.id,
      "notifications",
      true,
      app.status
    );
    revalidatePath("/customer-app");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create notification" };
  }
}

export async function salonToggleNotification(
  notificationId: string,
  published: boolean
): Promise<ActionResult> {
  try {
    const { app } = await requireEnabledApp();
    const { setNotificationPublished } = await import(
      "@/lib/customer-apps/notifications"
    );
    await setNotificationPublished(app.id, notificationId, published);
    revalidatePath("/customer-app");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not update notification" };
  }
}

export async function salonDeleteNotification(
  notificationId: string
): Promise<ActionResult> {
  try {
    const { app } = await requireEnabledApp();
    const { deleteNotification } = await import("@/lib/customer-apps/notifications");
    await deleteNotification(app.id, notificationId);
    revalidatePath("/customer-app");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not delete notification" };
  }
}

export async function salonSaveLeaderboardRules(
  rules: LeaderboardRules
): Promise<ActionResult> {
  try {
    const { app, user } = await requireEnabledApp();
    await upsertLeaderboardRules(app.id, user.id, rules);
    await syncFeatureOnDraftAndLive(
      app.id,
      user.id,
      "leaderboard",
      rules.enabled,
      app.status
    );
    revalidatePath("/customer-app");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save leaderboard rules" };
  }
}

export async function salonSetProductCatalogEnabled(
  enabled: boolean
): Promise<ActionResult> {
  try {
    const { app, user } = await requireEnabledApp();
    await setProductCatalogFeature(app.id, enabled);
    await syncFeatureOnDraftAndLive(
      app.id,
      user.id,
      "product_catalog",
      enabled,
      app.status
    );
    revalidatePath("/customer-app");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Update failed" };
  }
}

export async function salonSetProductAppVisible(
  productId: string,
  visible: boolean
): Promise<ActionResult> {
  try {
    const { app, org } = await requireEnabledApp();
    await setProductVisibility(app.id, org.organizationId, productId, visible);
    revalidatePath("/customer-app");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Visibility update failed" };
  }
}

export async function salonAddReel(input: {
  title: string;
  caption: string;
  videoUrl: string;
  posterUrl?: string;
  productId?: string;
}): Promise<ActionResult> {
  try {
    const { app, org, user } = await requireEnabledApp();
    if (!input.videoUrl.trim()) return { error: "Video URL is required" };
    await createReel({
      customerAppId: app.id,
      organizationId: org.organizationId,
      actorUserId: user.id,
      title: input.title || "Reel",
      caption: input.caption || "",
      videoUrl: input.videoUrl,
      posterUrl: input.posterUrl,
      productId: input.productId || null,
      isPublished: true,
    });
    // Enable reels-style discovery via homepage sections if needed
    const config = await getAppConfigBundle(app.id);
    const sections = new Set(config.draft.experience.homepageSections);
    sections.add("reels");
    await saveDraftSettings({
      customerAppId: app.id,
      actorUserId: user.id,
      settings: {
        ...config.draft,
        experience: {
          ...config.draft.experience,
          homepageSections: [...sections],
          navItems: Array.from(new Set([...config.draft.experience.navItems, "reels"])),
        },
      },
    });
    revalidatePath("/customer-app");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not add reel" };
  }
}

export async function salonToggleReel(
  reelId: string,
  isPublished: boolean
): Promise<ActionResult> {
  try {
    const { app } = await requireEnabledApp();
    await setReelPublished(reelId, app.id, isPublished);
    revalidatePath("/customer-app");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Update failed" };
  }
}

export async function salonDeleteReel(reelId: string): Promise<ActionResult> {
  try {
    const { app } = await requireEnabledApp();
    await deleteReel(reelId, app.id);
    revalidatePath("/customer-app");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Delete failed" };
  }
}

/** Grant points of a specific type to an app customer phone. */
export async function salonGrantTestPoints(
  phone: string,
  points: number,
  pointTypeId?: string
): Promise<ActionResult> {
  try {
    const { app, org } = await requireEnabledApp();
    const { ensureDefaultPointType, awardTypedPoints, upsertAppCustomer } =
      await import("@/lib/customer-apps/domain");
    const type =
      pointTypeId ||
      (await ensureDefaultPointType(app.id)).id;
    const appCustomer = await upsertAppCustomer({
      customerAppId: app.id,
      organizationId: org.organizationId,
      firstName: "Guest",
      phone,
    });
    await awardTypedPoints({
      customerAppId: app.id,
      organizationId: org.organizationId,
      phone,
      pointTypeId: type,
      delta: Math.trunc(points),
      reason: "Salon adjustment",
      idempotencyKey: `manual:${app.id}:${phone}:${type}:${Date.now()}`,
      appCustomerId: appCustomer.id,
    });
    revalidatePath("/customer-app");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Grant failed" };
  }
}

export async function salonUpsertAppCustomer(input: {
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  salonCustomerId?: string | null;
}): Promise<ActionResult> {
  try {
    const { app, org } = await requireEnabledApp();
    const { upsertAppCustomer } = await import("@/lib/customer-apps/domain");
    await upsertAppCustomer({
      customerAppId: app.id,
      organizationId: org.organizationId,
      ...input,
    });
    revalidatePath("/customer-app");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Save failed" };
  }
}

export async function salonLinkAppCustomer(
  appCustomerId: string,
  salonCustomerId: string | null
): Promise<ActionResult> {
  try {
    const { app } = await requireEnabledApp();
    const { linkAppCustomerToSalon } = await import("@/lib/customer-apps/domain");
    await linkAppCustomerToSalon(appCustomerId, app.id, salonCustomerId);
    revalidatePath("/customer-app");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Link failed" };
  }
}

export async function salonCreateAppProduct(input: {
  title: string;
  description?: string;
  price: number;
  imageUrl?: string;
  posProductId?: string | null;
}): Promise<ActionResult> {
  try {
    const { app, org } = await requireEnabledApp();
    const { createAppProduct } = await import("@/lib/customer-apps/domain");
    await createAppProduct({
      customerAppId: app.id,
      organizationId: org.organizationId,
      ...input,
    });
    revalidatePath("/customer-app");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Create failed" };
  }
}

export async function salonToggleAppProduct(
  productId: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    const { app } = await requireEnabledApp();
    const { updateAppProduct } = await import("@/lib/customer-apps/domain");
    await updateAppProduct(productId, app.id, { is_active: isActive });
    revalidatePath("/customer-app");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Update failed" };
  }
}

export async function salonDeleteAppProduct(productId: string): Promise<ActionResult> {
  try {
    const { app } = await requireEnabledApp();
    const { deleteAppProduct } = await import("@/lib/customer-apps/domain");
    await deleteAppProduct(productId, app.id);
    revalidatePath("/customer-app");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Delete failed" };
  }
}

export async function salonCreateAppDeal(input: {
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
}): Promise<ActionResult> {
  try {
    const { app, org } = await requireEnabledApp();
    const { createAppDeal } = await import("@/lib/customer-apps/domain");
    await createAppDeal({
      customerAppId: app.id,
      organizationId: org.organizationId,
      ...input,
    });
    revalidatePath("/customer-app");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Create failed" };
  }
}

export async function salonToggleAppDeal(
  dealId: string,
  isPublished: boolean
): Promise<ActionResult> {
  try {
    const { app } = await requireEnabledApp();
    const { updateAppDeal } = await import("@/lib/customer-apps/domain");
    await updateAppDeal(dealId, app.id, { is_published: isPublished });
    revalidatePath("/customer-app");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Update failed" };
  }
}

export async function salonDeleteAppDeal(dealId: string): Promise<ActionResult> {
  try {
    const { app } = await requireEnabledApp();
    const { deleteAppDeal } = await import("@/lib/customer-apps/domain");
    await deleteAppDeal(dealId, app.id);
    revalidatePath("/customer-app");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Delete failed" };
  }
}

export async function salonCreatePointType(input: {
  code: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  earnHint?: string;
}): Promise<ActionResult> {
  try {
    const { app } = await requireEnabledApp();
    const { createPointType } = await import("@/lib/customer-apps/domain");
    await createPointType({ customerAppId: app.id, ...input });
    revalidatePath("/customer-app");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Create failed" };
  }
}

export async function salonUpdatePointType(
  id: string,
  patch: {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    earn_hint?: string;
    is_active?: boolean;
  }
): Promise<ActionResult> {
  try {
    const { app } = await requireEnabledApp();
    const { updatePointType } = await import("@/lib/customer-apps/domain");
    await updatePointType(id, app.id, patch);
    revalidatePath("/customer-app");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Update failed" };
  }
}

export async function salonDeletePointType(id: string): Promise<ActionResult> {
  try {
    const { app } = await requireEnabledApp();
    const { deletePointType } = await import("@/lib/customer-apps/domain");
    await deletePointType(id, app.id);
    revalidatePath("/customer-app");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Delete failed" };
  }
}

export async function salonSaveLeaderboardTier(input: {
  rank: number;
  title: string;
  description?: string;
  rewardKind: "service" | "product" | "custom";
  rewardImageUrl?: string | null;
  serviceId?: string | null;
  appProductId?: string | null;
  customRewardLabel?: string;
}): Promise<ActionResult> {
  try {
    const { app } = await requireEnabledApp();
    const { upsertLeaderboardTier } = await import("@/lib/customer-apps/domain");
    await upsertLeaderboardTier({ customerAppId: app.id, ...input });
    revalidatePath("/customer-app");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Save failed" };
  }
}

export async function salonEnsureEngagementDefaults(): Promise<void> {
  const { app, user } = await requireEnabledApp();
  const admin = caAdmin();
  await admin.from("customer_app_loyalty_rules").upsert(
    { customer_app_id: app.id, updated_by: user.id },
    { onConflict: "customer_app_id", ignoreDuplicates: true }
  );
  await admin.from("customer_app_leaderboard_rules").upsert(
    { customer_app_id: app.id, updated_by: user.id },
    { onConflict: "customer_app_id", ignoreDuplicates: true }
  );
  const { ensureDefaultPointType, ensureDefaultLeaderboardTiers } =
    await import("@/lib/customer-apps/domain");
  await ensureDefaultPointType(app.id);
  await ensureDefaultLeaderboardTiers(app.id);
}
