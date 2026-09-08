import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { NavRouteGuard } from "@/components/layout/nav-route-guard";
import { QuickActionFab } from "@/components/dashboard/quick-action-fab";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { NavPermissionsConfig } from "@/lib/permissions/nav";
import type { MemberRole } from "@/types";

type AppShellProps = {
  children: React.ReactNode;
  organizationName?: string;
  userEmail?: string;
  userRole?: string;
  memberRole: MemberRole;
  navOverrides: NavPermissionsConfig;
  landingPath: string;
  showPlatformBilling?: boolean;
};

export function AppShell({
  children,
  organizationName,
  userEmail,
  userRole,
  memberRole,
  navOverrides,
  landingPath,
  showPlatformBilling = false,
}: AppShellProps) {
  return (
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
        >
          <div className="app-main flex-1 overflow-x-hidden overscroll-x-contain p-4 sm:p-6 lg:p-8">
            {children}
          </div>
          <QuickActionFab memberRole={memberRole} navOverrides={navOverrides} />
        </NavRouteGuard>
      </SidebarInset>
    </SidebarProvider>
  );
}
