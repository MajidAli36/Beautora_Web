import { AppShell } from "@/components/layout/app-shell";
import { SubscriptionCautionModal } from "@/components/billing/subscription-caution-modal";
import { requireAuth } from "@/lib/auth/session";
import { getActiveOrganization } from "@/lib/auth/organization";
import { ROLE_LABELS } from "@/lib/permissions/roles";
import { getOrgNavPermissions } from "@/lib/actions/role-permissions";
import { getOrganizationSubscription, getPlatformAdminFlag } from "@/lib/actions/billing";
import { getDefaultLandingPath } from "@/lib/permissions/nav";
import { BRAND } from "@/lib/marketing/brand";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SYNCOPS } from "@/lib/print/syncops";

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
  const overrides = await getOrgNavPermissions();
  const landingPath = getDefaultLandingPath(org.role, overrides);
  const billing = await getOrganizationSubscription();
  const isPlatformAdmin = await getPlatformAdminFlag();

  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";
  const onBilling =
    pathname.startsWith("/billing") || pathname.startsWith("/platform");

  if (billing?.snapshot.phase === "locked" && !onBilling) {
    redirect("/billing");
  }

  return (
    <AppShell
      organizationName={org.organizationName || BRAND.name}
      userEmail={user.email}
      userRole={ROLE_LABELS[org.role]}
      memberRole={org.role}
      navOverrides={overrides}
      landingPath={landingPath}
      showPlatformBilling={isPlatformAdmin}
    >
      {billing &&
        (billing.snapshot.phase === "grace" || billing.snapshot.phase === "locked") && (
          <SubscriptionCautionModal
            snapshot={billing.snapshot}
            orgName={billing.orgName}
          />
        )}
      {children}
    </AppShell>
  );
}
