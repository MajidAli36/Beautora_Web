"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getOrgPermissionConfig,
  requireAction,
} from "@/lib/auth/permissions";
import {
  getActiveOrganization,
  requireOrganization,
} from "@/lib/auth/organization";
import { createClient } from "@/lib/supabase/server";
import {
  ACTION_KEYS,
  ACTION_META,
  actionsForFeature,
  getEffectiveActionPermissions,
  type ActionKey,
  type ActionPermissionsConfig,
} from "@/lib/permissions/actions";
import {
  CONFIGURABLE_ROLES,
  DEFAULT_NAV_BY_ROLE,
  NAV_KEYS,
  NAV_KEY_LABELS,
  type NavKey,
  type NavPermissionsConfig,
  getEffectiveNavPermissions,
  filterNavGroupsForRole,
} from "@/lib/permissions/nav";
import { ROLE_LABELS } from "@/lib/permissions/roles";
import type { MemberRole } from "@/types";
import type { NavGroup } from "@/lib/navigation";
import type { ActionResult } from "@/types/commerce";

export type RoleFeaturePermissionRow = {
  feature: NavKey;
  featureLabel: string;
  visible: boolean;
  actions: Array<{
    key: ActionKey;
    label: string;
    enabled: boolean;
  }>;
};

export type RolePermissionMatrix = {
  role: MemberRole;
  roleLabel: string;
  features: RoleFeaturePermissionRow[];
};

/** @deprecated prefer RolePermissionMatrix */
export type RoleNavMatrix = {
  role: MemberRole;
  roleLabel: string;
  permissions: Record<NavKey, boolean>;
};

export async function getOrgNavPermissions(): Promise<NavPermissionsConfig> {
  await requireOrganization();
  const { nav } = await getOrgPermissionConfig();
  return nav;
}

export async function getOrgActionPermissions(): Promise<ActionPermissionsConfig> {
  await requireOrganization();
  const { actions } = await getOrgPermissionConfig();
  return actions;
}

export async function getNavForCurrentUser(): Promise<{
  navGroups: NavGroup[];
  permissions: Record<NavKey, boolean>;
  role: MemberRole;
}> {
  const org = await requireOrganization();
  const { nav } = await getOrgPermissionConfig();
  const permissions = getEffectiveNavPermissions(org.role, nav);
  const filtered = filterNavGroupsForRole(org.role, nav);

  return {
    navGroups: filtered,
    permissions,
    role: org.role,
  };
}

export async function getRoleNavMatrix(): Promise<RoleNavMatrix[]> {
  await requireAction("staff.manage_permissions");
  const { nav } = await getOrgPermissionConfig();

  return CONFIGURABLE_ROLES.map((role) => ({
    role,
    roleLabel: ROLE_LABELS[role],
    permissions: getEffectiveNavPermissions(role, nav),
  }));
}

export async function getRolePermissionMatrix(): Promise<RolePermissionMatrix[]> {
  await requireAction("staff.manage_permissions");
  const { nav, actions } = await getOrgPermissionConfig();

  return CONFIGURABLE_ROLES.map((role) => {
    const featureVis = getEffectiveNavPermissions(role, nav);
    const actionMap = getEffectiveActionPermissions(role, actions);

    const features: RoleFeaturePermissionRow[] = NAV_KEYS.map((feature) => {
      const actionKeys = actionsForFeature(feature);
      return {
        feature,
        featureLabel: NAV_KEY_LABELS[feature],
        visible: featureVis[feature],
        actions: actionKeys.map((key) => ({
          key,
          label: ACTION_META[key].label,
          enabled: featureVis[feature] ? actionMap[key] : false,
        })),
      };
    });

    return {
      role,
      roleLabel: ROLE_LABELS[role],
      features,
    };
  });
}

const updateNavSchema = z.object({
  role: z.enum(["ADMIN", "MANAGER", "CASHIER", "RECEPTIONIST", "STAFF"]),
  navKey: z.enum(NAV_KEYS as unknown as [NavKey, ...NavKey[]]),
  enabled: z.enum(["true", "false"]),
});

export async function updateRoleNavPermission(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const org = await requireAction("staff.manage_permissions");
  const parsed = updateNavSchema.safeParse({
    role: formData.get("role"),
    navKey: formData.get("navKey"),
    enabled: formData.get("enabled"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Keep Settings + Staff always on for ADMIN
  if (parsed.data.role === "ADMIN") {
    if (
      parsed.data.navKey === "settings" ||
      parsed.data.navKey === "staff"
    ) {
      return { success: true };
    }
  }

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("organizations")
    .select("nav_permissions")
    .eq("id", org.organizationId)
    .single();

  const existing = (current?.nav_permissions as NavPermissionsConfig) ?? {};
  const roleConfig = { ...(existing[parsed.data.role] ?? {}) };
  roleConfig[parsed.data.navKey] = parsed.data.enabled === "true";

  const updated: NavPermissionsConfig = {
    ...existing,
    [parsed.data.role]: roleConfig,
  };

  const { error } = await supabase
    .from("organizations")
    .update({ nav_permissions: updated })
    .eq("id", org.organizationId);

  if (error) return { error: error.message };

  revalidatePath("/staff");
  revalidatePath("/", "layout");
  return { success: true };
}

const updateActionSchema = z.object({
  role: z.enum(["ADMIN", "MANAGER", "CASHIER", "RECEPTIONIST", "STAFF"]),
  actionKey: z.enum(ACTION_KEYS as unknown as [ActionKey, ...ActionKey[]]),
  enabled: z.enum(["true", "false"]),
});

export async function updateRoleActionPermission(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const org = await requireAction("staff.manage_permissions");
  const parsed = updateActionSchema.safeParse({
    role: formData.get("role"),
    actionKey: formData.get("actionKey"),
    enabled: formData.get("enabled"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const lockedForAdmin: ActionKey[] = [
    "staff.manage_permissions",
    "staff.manage_logins",
    "settings.manage",
  ];
  if (
    parsed.data.role === "ADMIN" &&
    lockedForAdmin.includes(parsed.data.actionKey) &&
    parsed.data.enabled === "false"
  ) {
    return { error: "Admin must keep login and permission management." };
  }

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("organizations")
    .select("action_permissions")
    .eq("id", org.organizationId)
    .single();

  const existing =
    (current?.action_permissions as ActionPermissionsConfig) ?? {};
  const roleConfig = { ...(existing[parsed.data.role] ?? {}) };
  roleConfig[parsed.data.actionKey] = parsed.data.enabled === "true";

  const updated: ActionPermissionsConfig = {
    ...existing,
    [parsed.data.role]: roleConfig,
  };

  const { error } = await supabase
    .from("organizations")
    .update({ action_permissions: updated })
    .eq("id", org.organizationId);

  if (error) return { error: error.message };

  revalidatePath("/staff");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function resetRoleNavPermissions(
  role: MemberRole
): Promise<ActionResult> {
  const org = await requireAction("staff.manage_permissions");
  if (role === "OWNER") return { error: "Cannot reset owner permissions" };

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("organizations")
    .select("nav_permissions, action_permissions")
    .eq("id", org.organizationId)
    .single();

  const navExisting = {
    ...((current?.nav_permissions as NavPermissionsConfig) ?? {}),
  };
  const actionExisting = {
    ...((current?.action_permissions as ActionPermissionsConfig) ?? {}),
  };
  delete navExisting[role];
  delete actionExisting[role];

  const { error } = await supabase
    .from("organizations")
    .update({
      nav_permissions: navExisting,
      action_permissions: actionExisting,
    })
    .eq("id", org.organizationId);

  if (error) return { error: error.message };

  revalidatePath("/staff");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function getNavPermissionLabels() {
  return NAV_KEY_LABELS;
}

export async function getDefaultNavForRole(role: MemberRole) {
  return DEFAULT_NAV_BY_ROLE[role];
}

export async function getCurrentUserNavContext() {
  const org = await getActiveOrganization();
  if (!org) return null;
  const { nav } = await getOrgPermissionConfig();
  return {
    role: org.role,
    overrides: nav,
    permissions: getEffectiveNavPermissions(org.role, nav),
    navGroups: filterNavGroupsForRole(org.role, nav),
  };
}
