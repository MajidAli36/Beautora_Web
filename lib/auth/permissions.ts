import { cache } from "react";
import {
  getActiveOrganization,
  requireOrganization,
} from "@/lib/auth/organization";
import { assertOrgOperational } from "@/lib/billing/enforce";
import {
  canPerformAction,
  getFeatureCapability,
  type ActionKey,
  type ActionPermissionsConfig,
} from "@/lib/permissions/actions";
import {
  getEffectiveNavPermissions,
  type NavKey,
  type NavPermissionsConfig,
} from "@/lib/permissions/nav";
import { hasMinimumRole } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";
import type { MemberRole } from "@/types";

/** Actions allowed even when the store subscription is locked */
const LOCKED_ALLOWED_ACTIONS = new Set<ActionKey>(["billing.manage"]);

async function loadOrgPermissionRows(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select("nav_permissions, action_permissions")
    .eq("id", organizationId)
    .single();

  return {
    nav: (data?.nav_permissions as NavPermissionsConfig) ?? {},
    actions: (data?.action_permissions as ActionPermissionsConfig) ?? {},
  };
}

/** Cached once per request — used by nav + action checks. */
export const getOrgPermissionConfig = cache(async () => {
  const org = await getActiveOrganization();
  if (!org) {
    return {
      org: null as null,
      nav: {} as NavPermissionsConfig,
      actions: {} as ActionPermissionsConfig,
    };
  }
  const rows = await loadOrgPermissionRows(org.organizationId);
  return { org, ...rows };
});

export async function requireMinimumRole(requiredRole: MemberRole) {
  const org = await requireOrganization();
  if (!hasMinimumRole(org.role, requiredRole)) {
    throw new Error("Insufficient permissions");
  }
  // Monthly subscription hard lock (except billing flows use requireAction)
  await assertOrgOperational(org.organizationId);
  return org;
}

/** Enforce a granular action (feature must also be visible). */
export async function requireAction(action: ActionKey) {
  const org = await requireOrganization();
  const { nav, actions } = await getOrgPermissionConfig();
  if (!canPerformAction(org.role, action, actions, nav)) {
    throw new Error("Insufficient permissions");
  }
  if (!LOCKED_ALLOWED_ACTIONS.has(action)) {
    await assertOrgOperational(org.organizationId);
  }
  return org;
}

export async function checkAction(action: ActionKey): Promise<boolean> {
  const { org, nav, actions } = await getOrgPermissionConfig();
  if (!org) return false;
  return canPerformAction(org.role, action, actions, nav);
}

export async function getCapabilities(feature: NavKey) {
  const { org, nav, actions } = await getOrgPermissionConfig();
  if (!org) {
    return getFeatureCapability("STAFF", feature, {}, {});
  }
  return getFeatureCapability(org.role, feature, nav, actions);
}

/** Catalog / staff / chairs / devices / settings mutations (legacy aggregate). */
export async function canManageRecords() {
  const { org, nav, actions } = await getOrgPermissionConfig();
  if (!org) return false;
  if (org.role === "OWNER") return true;
  const features: NavKey[] = [
    "products",
    "services",
    "chairs",
    "staff",
    "devices",
    "settings",
  ];
  return features.some((feature) => {
    const caps = getFeatureCapability(org.role, feature, nav, actions);
    return caps.canManage;
  });
}

export async function canManageCustomers() {
  return checkAction("customers.edit");
}

export async function canDeleteCustomers() {
  return checkAction("customers.delete");
}

export async function canUsePos() {
  return checkAction("pos.sell");
}

export async function canViewReports() {
  return checkAction("reports.view");
}

export async function canUseWhatsApp() {
  return checkAction("whatsapp.send");
}

export async function canUseFeedback() {
  return checkAction("feedback.collect");
}

export async function canOperateQueue() {
  return checkAction("queue.operate");
}

export async function canApproveDeposits() {
  return checkAction("online_booking.approve");
}

export async function canConfigureOnlineBooking() {
  return checkAction("online_booking.configure");
}

export async function canOpenCashDrawer() {
  const openQueue = await checkAction("queue.open_drawer");
  const openPos = await checkAction("pos.open_drawer");
  return openQueue || openPos;
}

export async function canAccessFeature(feature: NavKey) {
  const { org, nav } = await getOrgPermissionConfig();
  if (!org) return false;
  return getEffectiveNavPermissions(org.role, nav)[feature];
}
