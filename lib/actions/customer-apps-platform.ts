"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { isPlatformAdminEmail } from "@/lib/billing/subscription";
import {
  enableCustomerAppForOrg,
  getAppConfigBundle,
  getCustomerAppById,
  listCustomerApps,
  publishCustomerApp,
  saveDraftSettings,
  setCustomerAppStatus,
} from "@/lib/customer-apps/service";
import { readinessChecklist } from "@/lib/customer-apps/defaults";
import type { CustomerAppSettings } from "@/lib/customer-apps/types";
import type { ActionResult } from "@/types/commerce";
import { createAdminClient } from "@/lib/supabase/admin";

async function requirePlatformAdmin() {
  const user = await getSession();
  if (!user || !isPlatformAdminEmail(user.email)) {
    throw new Error("Platform admin only");
  }
  return user;
}

export async function platformListCustomerApps() {
  await requirePlatformAdmin();
  return listCustomerApps();
}

export async function platformGetCustomerAppDetail(appId: string) {
  await requirePlatformAdmin();
  const app = await getCustomerAppById(appId);
  if (!app) return null;
  const config = await getAppConfigBundle(app.id);
  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("id, name, slug")
    .eq("id", app.organization_id)
    .maybeSingle();
  return {
    app,
    org,
    config,
    checklist: readinessChecklist(config.draft),
  };
}

export async function platformEnableCustomerApp(
  organizationId: string,
  appName?: string
): Promise<ActionResult & { appId?: string }> {
  const user = await requirePlatformAdmin();
  try {
    const app = await enableCustomerAppForOrg({
      organizationId,
      actorUserId: user.id,
      appName,
    });
    revalidatePath("/platform/customer-apps");
    revalidatePath("/customer-app");
    return { success: true, appId: app.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to enable app" };
  }
}

export async function platformSaveCustomerAppDraft(
  appId: string,
  settings: CustomerAppSettings
): Promise<ActionResult> {
  const user = await requirePlatformAdmin();
  try {
    await saveDraftSettings({
      customerAppId: appId,
      actorUserId: user.id,
      settings,
      displayName: settings.branding.appName,
    });
    revalidatePath(`/platform/customer-apps/${appId}`);
    revalidatePath("/customer-app");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Save failed" };
  }
}

export async function platformPublishCustomerApp(appId: string): Promise<ActionResult> {
  const user = await requirePlatformAdmin();
  try {
    const detail = await platformGetCustomerAppDetail(appId);
    if (!detail) return { error: "App not found" };
    const failed = detail.checklist.filter((c) => !c.ok);
    if (failed.length) {
      return {
        error: `Not ready: ${failed.map((f) => f.label).join(", ")}`,
      };
    }
    await publishCustomerApp({ customerAppId: appId, actorUserId: user.id });
    revalidatePath(`/platform/customer-apps/${appId}`);
    revalidatePath("/platform/customer-apps");
    revalidatePath("/customer-app");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Publish failed" };
  }
}

export async function platformSuspendCustomerApp(appId: string): Promise<ActionResult> {
  const user = await requirePlatformAdmin();
  try {
    await setCustomerAppStatus({
      customerAppId: appId,
      actorUserId: user.id,
      status: "suspended",
    });
    revalidatePath("/platform/customer-apps");
    revalidatePath(`/platform/customer-apps/${appId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Suspend failed" };
  }
}

export async function platformDeactivateCustomerApp(appId: string): Promise<ActionResult> {
  const user = await requirePlatformAdmin();
  try {
    await setCustomerAppStatus({
      customerAppId: appId,
      actorUserId: user.id,
      status: "deactivated",
    });
    revalidatePath("/platform/customer-apps");
    revalidatePath(`/platform/customer-apps/${appId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Deactivate failed" };
  }
}

export async function platformListOrgsWithoutApp() {
  await requirePlatformAdmin();
  const apps = await listCustomerApps();
  const have = new Set(apps.map((a) => a.organization_id));
  const admin = createAdminClient();
  const { data: orgs } = await admin
    .from("organizations")
    .select("id, name, slug")
    .order("name")
    .limit(500);
  return (orgs ?? []).filter((o) => !have.has(o.id));
}
