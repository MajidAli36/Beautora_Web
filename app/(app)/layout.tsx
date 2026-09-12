import { AppShell } from "@/components/layout/app-shell";
import { SubscriptionCautionModal } from "@/components/billing/subscription-caution-modal";
import { requireAuth } from "@/lib/auth/session";
import { getActiveOrganization } from "@/lib/auth/organization";
import { ROLE_LABELS } from "@/lib/permissions/roles";
import { getOrgNavPermissions } from "@/lib/actions/role-permissions";
import { getOrganizationSubscription, getPlatformAdminFlag } from "@/lib/actions/billing";
import {
  canAccessNavKey,
  canAccessPath,
  getDefaultLandingPath,
  type NavPermissionsConfig,
} from "@/lib/permissions/nav";
import {
  getLinkedStaffProfile,
  isOwnStaffDashboardPath,
} from "@/lib/staff/linked-profile";
import { BRAND } from "@/lib/marketing/brand";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SYNCOPS } from "@/lib/print/syncops";
import { currencyFromCountry } from "@/lib/currency/from-country";
import { runWithCurrency } from "@/lib/currency/runtime.server";

export const metadata: Metadata = {
  title: {
    default: `Dashboard | ${BRAND.name} · ${SYNCOPS.name}`,
    template: `%s | ${BRAND.name} · ${SYNCOPS.name}`,
  },
  robots: { index: false, follow: false },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const org = await getActiveOrganization();
  if (!org) {
    redirect("/onboarding");
  }
  const [overrides, billing, isPlatformAdmin, linkedStaff] = await Promise.all([
    getOrgNavPermissions(),
    getOrganizationSubscription(),
    getPlatformAdminFlag(),
    getLinkedStaffProfile().catch(() => null),
  ]);
  const locked = billing?.snapshot.phase === "locked";
  const hasLifetimeAccess =
    billing?.snapshot.phase === "lifetime" ||
    Boolean(billing?.snapshot.lifetimeAccess);

  // When locked, every role must reach /billing (avoid redirect loops)
  const effectiveOverrides: NavPermissionsConfig = locked
    ? {
        ...overrides,
        [org.role]: {
          ...(overrides[org.role] ?? {}),
          billing: true,
        },
      }
    : overrides;

  const myStaffHref = linkedStaff ? `/staff/${linkedStaff.id}` : null;
  const staffNavAllowed = canAccessNavKey(org.role, "staff", effectiveOverrides);

  let landingPath = locked
    ? "/billing"
    : getDefaultLandingPath(org.role, effectiveOverrides);

  // Staff login with a linked salon profile lands on their own dashboard.
  if (!locked && myStaffHref && (org.role === "STAFF" || !staffNavAllowed)) {
    landingPath = myStaffHref;
  }

  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";
  const onBilling =
    pathname.startsWith("/billing") || pathname.startsWith("/platform");
  const onOwnStaffDashboard = isOwnStaffDashboardPath(pathname, linkedStaff?.id);

  if (locked && !onBilling) {
    redirect("/billing");
  }

  // Server-side feature gate (not only client NavRouteGuard)
  if (
    pathname &&
    !locked &&
    !onBilling &&
    !onOwnStaffDashboard &&
    !canAccessPath(org.role, pathname, effectiveOverrides)
  ) {
    redirect(landingPath);
  }

  // /staff directory without staff nav → own dashboard if linked
  if (pathname === "/staff" && !locked && !staffNavAllowed && myStaffHref) {
    redirect(myStaffHref);
  }

  return runWithCurrency(currencyFromCountry(org.country), () => (
    <AppShell
      organizationName={org.organizationName || BRAND.name}
      organizationCountry={org.country}
      userEmail={user.email}
      userRole={ROLE_LABELS[org.role]}
      memberRole={org.role}
      navOverrides={effectiveOverrides}
      landingPath={landingPath}
      myStaffHref={myStaffHref}
      showPlatformBilling={isPlatformAdmin}
      subscriptionLocked={Boolean(locked)}
      hasLifetimeAccess={hasLifetimeAccess}
    >
      {billing &&
        !hasLifetimeAccess &&
        (billing.snapshot.phase === "grace" || billing.snapshot.phase === "locked") && (
          <SubscriptionCautionModal
            snapshot={billing.snapshot}
            orgName={billing.orgName}
          />
        )}
      {children}
    </AppShell>
  ));
}
