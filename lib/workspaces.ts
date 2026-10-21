/**
 * Single source of truth for Beautora workspaces (Salon POS · Marketplace · App dashboard).
 * UI switchers and landing routes must import from here — do not scatter mode routes.
 */

import type { LucideIcon } from "lucide-react";
import { LayoutGrid, Smartphone, Store } from "lucide-react";
import type { ProductIntent } from "@/lib/auth/account-types";
import { productIntentAllowsMode } from "@/lib/auth/account-types";
import type { AppMode } from "@/lib/marketplace/constants";
import { BEAUTORA_PRODUCTS, productForMode } from "@/lib/marketing/products";

export type WorkspaceId = AppMode;

export type WorkspaceDefinition = {
  id: WorkspaceId;
  name: string;
  shortLabel: string;
  tagline: string;
  description: string;
  /** Compact switcher blurb (modules at a glance). */
  switcherDescription: string;
  /** Client-side landing path after switch (must exist). */
  href: string;
  icon: LucideIcon;
};

export const WORKSPACE_LANDING: Record<WorkspaceId, string> = {
  saas: "/dashboard",
  marketplace: "/marketplace",
  customer_app: "/customer-app",
};

export const WORKSPACES: WorkspaceDefinition[] = [
  {
    id: "saas",
    name: BEAUTORA_PRODUCTS.saas.name,
    shortLabel: BEAUTORA_PRODUCTS.saas.shortLabel,
    tagline: BEAUTORA_PRODUCTS.saas.tagline,
    description: BEAUTORA_PRODUCTS.saas.description,
    switcherDescription:
      "Appointments, customers, queue, POS, sales, services, stock, staff & reports",
    href: WORKSPACE_LANDING.saas,
    icon: LayoutGrid,
  },
  {
    id: "marketplace",
    name: BEAUTORA_PRODUCTS.marketplace.name,
    shortLabel: BEAUTORA_PRODUCTS.marketplace.shortLabel,
    tagline: BEAUTORA_PRODUCTS.marketplace.tagline,
    description: BEAUTORA_PRODUCTS.marketplace.description,
    switcherDescription:
      "Marketplace products, inventory, COD orders, order management & payouts",
    href: WORKSPACE_LANDING.marketplace,
    icon: Store,
  },
  {
    id: "customer_app",
    name: BEAUTORA_PRODUCTS.customer_app.name,
    shortLabel: BEAUTORA_PRODUCTS.customer_app.shortLabel,
    tagline: BEAUTORA_PRODUCTS.customer_app.tagline,
    description: BEAUTORA_PRODUCTS.customer_app.description,
    switcherDescription:
      "App branding, loyalty points, leaderboard, deals, products & reels",
    href: WORKSPACE_LANDING.customer_app,
    icon: Smartphone,
  },
];

export function getWorkspace(id: WorkspaceId): WorkspaceDefinition {
  return WORKSPACES.find((w) => w.id === id) ?? WORKSPACES[0]!;
}

export function workspaceLanding(mode: WorkspaceId): string {
  return WORKSPACE_LANDING[mode] ?? "/dashboard";
}

export function workspaceLabel(mode: WorkspaceId): string {
  return productForMode(mode).name;
}

/** Which workspaces this user may open (frontend visibility only — server still enforces). */
export function visibleWorkspaces(input: {
  productIntent?: ProductIntent | null;
  customerAppEnabled?: boolean;
}): WorkspaceDefinition[] {
  const intent = input.productIntent ?? "both";
  return WORKSPACES.filter((w) => {
    if (w.id === "customer_app") return Boolean(input.customerAppEnabled);
    return productIntentAllowsMode(intent, w.id);
  });
}

export function canAccessWorkspace(
  id: WorkspaceId,
  input: { productIntent?: ProductIntent | null; customerAppEnabled?: boolean }
): boolean {
  return visibleWorkspaces(input).some((w) => w.id === id);
}
