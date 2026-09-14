import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { NavigationLoader } from "@/components/layout/navigation-loader";
import { NavRouteGuard } from "@/components/layout/nav-route-guard";
import { QuickActionFab } from "@/components/dashboard/quick-action-fab";
import { CurrencyProvider } from "@/components/providers/currency-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { NavPermissionsConfig } from "@/lib/permissions/nav";
import type { MemberRole } from "@/types";
import type { AppMode } from "@/lib/marketplace/constants";
import type { ProductIntent } from "@/lib/auth/account-types";

type AppShellProps = {
  children: React.ReactNode;
  organizationName?: string;
  /** Store country — drives Rs / USD / AED etc. */
  organizationCountry?: string | null;
  userEmail?: string;
  userRole?: string;
  memberRole: MemberRole;
  navOverrides: NavPermissionsConfig;
  landingPath: string;
  /** Linked salon staff profile dashboard for the signed-in user. */
  myStaffHref?: string | null;
  showPlatformBilling?: boolean;
  subscriptionLocked?: boolean;
  hasLifetimeAccess?: boolean;
  appMode?: AppMode;
  productIntent?: ProductIntent | null;
};

export function AppShell({
  children,
  organizationName,
  organizationCountry = null,
  userEmail,
  userRole,
  memberRole,
  navOverrides,
  landingPath,
  myStaffHref = null,
  showPlatformBilling = false,
  subscriptionLocked = false,
  hasLifetimeAccess = false,
  appMode = "saas",
  productIntent = "both",
}: AppShellProps) {
  const isMarketplace = appMode === "marketplace";
  return (
    <CurrencyProvider country={organizationCountry}>
      <SidebarProvider>
        <AppSidebar
          memberRole={memberRole}
          navOverrides={navOverrides}
          organizationName={organizationName}
          userEmail={userEmail}
          userRole={userRole}
          myStaffHref={isMarketplace ? null : myStaffHref}
          showPlatformBilling={showPlatformBilling}
          appMode={appMode}
          productIntent={productIntent}
        />
        <SidebarInset className="flex min-h-svh flex-col bg-background">
          <AppHeader
            organizationName={organizationName}
            userEmail={userEmail}
            userRole={userRole}
            hasLifetimeAccess={hasLifetimeAccess}
          />
          <NavRouteGuard
            role={memberRole}
            overrides={navOverrides}
            landingPath={isMarketplace ? "/marketplace" : landingPath}
            myStaffHref={isMarketplace ? null : myStaffHref}
            subscriptionLocked={subscriptionLocked}
          >
            <div className="app-main relative flex-1 overflow-x-hidden overscroll-x-contain p-4 sm:p-6 lg:p-8">
              <NavigationLoader />
              {children}
            </div>
            {!isMarketplace ? (
              <QuickActionFab memberRole={memberRole} navOverrides={navOverrides} />
            ) : null}
          </NavRouteGuard>
        </SidebarInset>
      </SidebarProvider>
    </CurrencyProvider>
  );
}
