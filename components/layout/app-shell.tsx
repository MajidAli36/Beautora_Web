import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { NavigationLoader } from "@/components/layout/navigation-loader";
import { NavRouteGuard } from "@/components/layout/nav-route-guard";
import { QuickActionFab } from "@/components/dashboard/quick-action-fab";
import { CurrencyProvider } from "@/components/providers/currency-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { NavPermissionsConfig } from "@/lib/permissions/nav";
import type { MemberRole } from "@/types";

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
  showPlatformBilling?: boolean;
  subscriptionLocked?: boolean;
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
  showPlatformBilling = false,
  subscriptionLocked = false,
}: AppShellProps) {
  return (
    <CurrencyProvider country={organizationCountry}>
      <SidebarProvider>
        <AppSidebar
          memberRole={memberRole}
          navOverrides={navOverrides}
          organizationName={organizationName}
          userEmail={userEmail}
          userRole={userRole}
          showPlatformBilling={showPlatformBilling}
        />
        <SidebarInset className="flex min-h-svh flex-col bg-background">
          <AppHeader
            organizationName={organizationName}
            userEmail={userEmail}
            userRole={userRole}
          />
          <NavRouteGuard
            role={memberRole}
            overrides={navOverrides}
            landingPath={landingPath}
            subscriptionLocked={subscriptionLocked}
          >
            <div className="app-main relative flex-1 overflow-x-hidden overscroll-x-contain p-4 sm:p-6 lg:p-8">
              <NavigationLoader />
              {children}
            </div>
            <QuickActionFab memberRole={memberRole} navOverrides={navOverrides} />
          </NavRouteGuard>
        </SidebarInset>
      </SidebarProvider>
    </CurrencyProvider>
  );
}
