import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { NavigationLoader } from "@/components/layout/navigation-loader";
import { NavRouteGuard } from "@/components/layout/nav-route-guard";
import { QuickActionFabLazy } from "@/components/dashboard/quick-action-fab-lazy";
import { CurrencyProvider } from "@/components/providers/currency-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { NavPermissionsConfig } from "@/lib/permissions/nav";
import type { MemberRole } from "@/types";
import type { AppMode } from "@/lib/marketplace/constants";
import type { ProductIntent } from "@/lib/auth/account-types";
import { workspaceLanding } from "@/lib/workspaces";

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
  customerAppEnabled?: boolean;
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
  customerAppEnabled = false,
}: AppShellProps) {
  const isMarketplace = appMode === "marketplace";
  const isCustomerApp = appMode === "customer_app";
  const modeLanding =
    appMode === "saas" ? landingPath : workspaceLanding(appMode);
  return (
    <CurrencyProvider country={organizationCountry}>
      <SidebarProvider>
        <AppSidebar
          memberRole={memberRole}
          navOverrides={navOverrides}
          organizationName={organizationName}
          userEmail={userEmail}
          userRole={userRole}
          myStaffHref={isMarketplace || isCustomerApp ? null : myStaffHref}
          showPlatformBilling={showPlatformBilling}
          appMode={appMode}
          productIntent={productIntent}
          customerAppEnabled={customerAppEnabled}
        />
        <SidebarInset className="flex min-h-svh min-w-0 max-w-full flex-col overflow-x-clip bg-background">
          <AppHeader
            organizationName={organizationName}
            userEmail={userEmail}
            userRole={userRole}
            hasLifetimeAccess={hasLifetimeAccess}
            appMode={appMode}
            productIntent={productIntent}
            customerAppEnabled={customerAppEnabled}
          />
          <NavRouteGuard
            role={memberRole}
            overrides={navOverrides}
            landingPath={modeLanding}
            myStaffHref={isMarketplace || isCustomerApp ? null : myStaffHref}
            subscriptionLocked={subscriptionLocked}
          >
            <div className="app-main relative min-w-0 flex-1 overflow-x-hidden overscroll-x-contain px-3 py-4 sm:p-6 lg:p-8">
              <NavigationLoader />
              {children}
            </div>
            {!isMarketplace ? (
              <QuickActionFabLazy memberRole={memberRole} navOverrides={navOverrides} />
            ) : null}
          </NavRouteGuard>
        </SidebarInset>
      </SidebarProvider>
    </CurrencyProvider>
  );
}
