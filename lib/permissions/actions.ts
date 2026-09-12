import type { MemberRole } from "@/types";
import {
  getEffectiveNavPermissions,
  type NavKey,
  type NavPermissionsConfig,
} from "@/lib/permissions/nav";
import { hasMinimumRole } from "@/lib/permissions/roles";

/**
 * Granular actions inside a feature.
 * Feature visibility stays in nav_permissions; these control what the role may DO.
 */
export const ACTION_KEYS = [
  // customers
  "customers.create",
  "customers.edit",
  "customers.delete",
  // appointments
  "appointments.create",
  "appointments.edit",
  "appointments.cancel",
  // online booking
  "online_booking.approve",
  "online_booking.configure",
  // queue
  "queue.operate",
  "queue.open_drawer",
  // pos / sales
  "pos.sell",
  "pos.open_drawer",
  "sales.create",
  "sales.edit",
  "sales.void",
  "sales.refund",
  // catalog
  "services.create",
  "services.edit",
  "services.delete",
  "products.create",
  "products.edit",
  "products.delete",
  "chairs.create",
  "chairs.edit",
  "chairs.delete",
  // team / ops
  "staff.create",
  "staff.edit",
  "staff.delete",
  "staff.manage_logins",
  "staff.manage_permissions",
  "attendance.manage",
  "devices.create",
  "devices.edit",
  "devices.delete",
  // insights / money
  "reports.view",
  "finances.create",
  "finances.edit",
  "finances.delete",
  // channels
  "whatsapp.send",
  "feedback.collect",
  "billing.manage",
  "settings.manage",
] as const;

export type ActionKey = (typeof ACTION_KEYS)[number];

export type ActionPermissionsConfig = Partial<
  Record<MemberRole, Partial<Record<ActionKey, boolean>>>
>;

export type FeatureCapability = {
  feature: NavKey;
  visible: boolean;
  actions: Partial<Record<ActionKey, boolean>>;
  /** Convenience: any mutating action */
  canManage: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

type ActionMeta = {
  key: ActionKey;
  feature: NavKey;
  label: string;
  /** Built-in default before org admin overrides in Staff → Features & actions */
  defaultMinRole: MemberRole;
};

export const ACTION_META: Record<ActionKey, ActionMeta> = {
  "customers.create": {
    key: "customers.create",
    feature: "customers",
    label: "Create",
    defaultMinRole: "RECEPTIONIST",
  },
  "customers.edit": {
    key: "customers.edit",
    feature: "customers",
    label: "Edit",
    defaultMinRole: "RECEPTIONIST",
  },
  "customers.delete": {
    key: "customers.delete",
    feature: "customers",
    label: "Delete",
    defaultMinRole: "MANAGER",
  },
  "appointments.create": {
    key: "appointments.create",
    feature: "appointments",
    label: "Create",
    defaultMinRole: "RECEPTIONIST",
  },
  "appointments.edit": {
    key: "appointments.edit",
    feature: "appointments",
    label: "Edit",
    defaultMinRole: "RECEPTIONIST",
  },
  "appointments.cancel": {
    key: "appointments.cancel",
    feature: "appointments",
    label: "Cancel",
    defaultMinRole: "RECEPTIONIST",
  },
  "online_booking.approve": {
    key: "online_booking.approve",
    feature: "online_booking",
    label: "Approve deposits",
    defaultMinRole: "RECEPTIONIST",
  },
  "online_booking.configure": {
    key: "online_booking.configure",
    feature: "online_booking",
    label: "Configure",
    defaultMinRole: "MANAGER",
  },
  "queue.operate": {
    key: "queue.operate",
    feature: "queue",
    label: "Operate queue",
    defaultMinRole: "RECEPTIONIST",
  },
  "queue.open_drawer": {
    key: "queue.open_drawer",
    feature: "queue",
    label: "Open cash drawer",
    defaultMinRole: "RECEPTIONIST",
  },
  "pos.sell": {
    key: "pos.sell",
    feature: "pos",
    label: "Sell / checkout",
    defaultMinRole: "RECEPTIONIST",
  },
  "pos.open_drawer": {
    key: "pos.open_drawer",
    feature: "pos",
    label: "Open cash drawer",
    defaultMinRole: "RECEPTIONIST",
  },
  "sales.create": {
    key: "sales.create",
    feature: "sales",
    label: "Create",
    defaultMinRole: "RECEPTIONIST",
  },
  "sales.edit": {
    key: "sales.edit",
    feature: "sales",
    label: "Edit / amend",
    defaultMinRole: "MANAGER",
  },
  "sales.void": {
    key: "sales.void",
    feature: "sales",
    label: "Void",
    defaultMinRole: "MANAGER",
  },
  "sales.refund": {
    key: "sales.refund",
    feature: "sales",
    label: "Refund",
    defaultMinRole: "MANAGER",
  },
  "services.create": {
    key: "services.create",
    feature: "services",
    label: "Create",
    defaultMinRole: "MANAGER",
  },
  "services.edit": {
    key: "services.edit",
    feature: "services",
    label: "Edit",
    defaultMinRole: "MANAGER",
  },
  "services.delete": {
    key: "services.delete",
    feature: "services",
    label: "Delete",
    defaultMinRole: "MANAGER",
  },
  "products.create": {
    key: "products.create",
    feature: "products",
    label: "Create",
    defaultMinRole: "MANAGER",
  },
  "products.edit": {
    key: "products.edit",
    feature: "products",
    label: "Edit",
    defaultMinRole: "MANAGER",
  },
  "products.delete": {
    key: "products.delete",
    feature: "products",
    label: "Delete",
    defaultMinRole: "MANAGER",
  },
  "chairs.create": {
    key: "chairs.create",
    feature: "chairs",
    label: "Create",
    defaultMinRole: "MANAGER",
  },
  "chairs.edit": {
    key: "chairs.edit",
    feature: "chairs",
    label: "Edit",
    defaultMinRole: "MANAGER",
  },
  "chairs.delete": {
    key: "chairs.delete",
    feature: "chairs",
    label: "Delete",
    defaultMinRole: "MANAGER",
  },
  "staff.create": {
    key: "staff.create",
    feature: "staff",
    label: "Create profiles",
    defaultMinRole: "MANAGER",
  },
  "staff.edit": {
    key: "staff.edit",
    feature: "staff",
    label: "Edit profiles",
    defaultMinRole: "MANAGER",
  },
  "staff.delete": {
    key: "staff.delete",
    feature: "staff",
    label: "Delete profiles",
    defaultMinRole: "MANAGER",
  },
  "staff.manage_logins": {
    key: "staff.manage_logins",
    feature: "staff",
    label: "Manage app logins",
    defaultMinRole: "ADMIN",
  },
  "staff.manage_permissions": {
    key: "staff.manage_permissions",
    feature: "staff",
    label: "Manage role access",
    defaultMinRole: "ADMIN",
  },
  "attendance.manage": {
    key: "attendance.manage",
    feature: "attendance",
    label: "Manage attendance",
    defaultMinRole: "MANAGER",
  },
  "devices.create": {
    key: "devices.create",
    feature: "devices",
    label: "Create",
    defaultMinRole: "MANAGER",
  },
  "devices.edit": {
    key: "devices.edit",
    feature: "devices",
    label: "Edit",
    defaultMinRole: "MANAGER",
  },
  "devices.delete": {
    key: "devices.delete",
    feature: "devices",
    label: "Delete",
    defaultMinRole: "MANAGER",
  },
  "reports.view": {
    key: "reports.view",
    feature: "reports",
    label: "View reports",
    defaultMinRole: "MANAGER",
  },
  "finances.create": {
    key: "finances.create",
    feature: "finances",
    label: "Create",
    defaultMinRole: "MANAGER",
  },
  "finances.edit": {
    key: "finances.edit",
    feature: "finances",
    label: "Edit",
    defaultMinRole: "MANAGER",
  },
  "finances.delete": {
    key: "finances.delete",
    feature: "finances",
    label: "Delete",
    defaultMinRole: "MANAGER",
  },
  "whatsapp.send": {
    key: "whatsapp.send",
    feature: "whatsapp",
    label: "Send messages",
    defaultMinRole: "RECEPTIONIST",
  },
  "feedback.collect": {
    key: "feedback.collect",
    feature: "feedback",
    label: "Collect feedback",
    defaultMinRole: "RECEPTIONIST",
  },
  "billing.manage": {
    key: "billing.manage",
    feature: "billing",
    label: "Manage billing",
    defaultMinRole: "ADMIN",
  },
  "settings.manage": {
    key: "settings.manage",
    feature: "settings",
    label: "Manage settings",
    defaultMinRole: "MANAGER",
  },
};

/** Features that have configurable actions (dashboard has none). */
export const FEATURES_WITH_ACTIONS: NavKey[] = [
  "customers",
  "appointments",
  "online_booking",
  "queue",
  "pos",
  "sales",
  "services",
  "products",
  "chairs",
  "staff",
  "attendance",
  "devices",
  "reports",
  "finances",
  "whatsapp",
  "feedback",
  "billing",
  "settings",
];

export function actionsForFeature(feature: NavKey): ActionKey[] {
  return ACTION_KEYS.filter((key) => ACTION_META[key].feature === feature);
}

function defaultActionAllowed(role: MemberRole, action: ActionKey): boolean {
  if (role === "OWNER") return true;
  // Billing: only owner by default (admin can grant via override)
  if (action === "billing.manage") return false;
  return hasMinimumRole(role, ACTION_META[action].defaultMinRole);
}

export function getEffectiveActionPermissions(
  role: MemberRole,
  overrides?: ActionPermissionsConfig | null
): Record<ActionKey, boolean> {
  const result = {} as Record<ActionKey, boolean>;
  for (const key of ACTION_KEYS) {
    if (role === "OWNER") {
      result[key] = true;
      continue;
    }
    const override = overrides?.[role]?.[key];
    result[key] =
      override !== undefined ? override : defaultActionAllowed(role, key);
  }

  // Admins must keep permission-management so they can fix lockouts
  if (role === "ADMIN") {
    result["staff.manage_permissions"] = true;
    result["staff.manage_logins"] = true;
    result["settings.manage"] = true;
  }

  return result;
}

export function canPerformAction(
  role: MemberRole,
  action: ActionKey,
  actionOverrides?: ActionPermissionsConfig | null,
  navOverrides?: NavPermissionsConfig | null
): boolean {
  if (role === "OWNER") return true;

  // Locked admin capabilities must work even if Staff/Settings nav is misconfigured
  if (
    role === "ADMIN" &&
    (action === "staff.manage_permissions" ||
      action === "staff.manage_logins" ||
      action === "settings.manage")
  ) {
    return true;
  }

  const feature = ACTION_META[action].feature;
  const nav = getEffectiveNavPermissions(role, navOverrides);
  if (!nav[feature]) return false;

  return getEffectiveActionPermissions(role, actionOverrides)[action];
}

export function getFeatureCapability(
  role: MemberRole,
  feature: NavKey,
  navOverrides?: NavPermissionsConfig | null,
  actionOverrides?: ActionPermissionsConfig | null
): FeatureCapability {
  const visible = getEffectiveNavPermissions(role, navOverrides)[feature];
  const actions = getEffectiveActionPermissions(role, actionOverrides);
  const featureActions = actionsForFeature(feature);
  const scoped: Partial<Record<ActionKey, boolean>> = {};
  for (const key of featureActions) {
    scoped[key] = visible
      ? canPerformAction(role, key, actionOverrides, navOverrides)
      : false;
  }

  const canCreate = Boolean(
    featureActions.some((k) => k.endsWith(".create") && scoped[k])
  );
  const canEdit = Boolean(
    featureActions.some(
      (k) =>
        scoped[k] &&
        (k.endsWith(".edit") ||
          k.endsWith(".manage") ||
          k.endsWith(".configure") ||
          k.endsWith(".operate") ||
          k.endsWith(".sell") ||
          k.endsWith(".send") ||
          k.endsWith(".collect") ||
          k.endsWith(".approve") ||
          k.endsWith(".view"))
    )
  );
  const canDelete = Boolean(
    featureActions.some(
      (k) =>
        scoped[k] &&
        (k.endsWith(".delete") ||
          k.endsWith(".void") ||
          k.endsWith(".cancel") ||
          k.endsWith(".refund"))
    )
  );

  const canManage =
    canCreate ||
    canEdit ||
    canDelete ||
    featureActions.some((k) => Boolean(scoped[k]));

  return {
    feature,
    visible,
    actions: scoped,
    canManage,
    canCreate,
    canEdit,
    canDelete,
  };
}
