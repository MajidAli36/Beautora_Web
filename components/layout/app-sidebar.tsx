"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, UserRound, Wallet } from "lucide-react";
import { BeautoraLogo } from "@/components/brand/beautora-logo";
import { filterNavGroupsForRole, type NavPermissionsConfig } from "@/lib/permissions/nav";
import { marketplaceNavGroups } from "@/lib/navigation";
import type { MemberRole } from "@/types";
import type { AppMode } from "@/lib/marketplace/constants";
import type { ProductIntent } from "@/lib/auth/account-types";
import { getInitials } from "@/lib/format";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BRAND } from "@/lib/marketing/brand";
import { productForMode } from "@/lib/marketing/products";
import { UserMenu } from "@/components/layout/user-menu";
import { AppModeSwitcherItems } from "@/components/layout/app-mode-switcher";

type AppSidebarProps = {
  memberRole: MemberRole;
  navOverrides: NavPermissionsConfig;
  organizationName?: string;
  userEmail?: string;
  userRole?: string;
  myStaffHref?: string | null;
  showPlatformBilling?: boolean;
  appMode?: AppMode;
  productIntent?: ProductIntent | null;
};

export function AppSidebar({
  memberRole,
  navOverrides,
  organizationName = BRAND.name,
  userEmail,
  userRole = "Owner",
  myStaffHref = null,
  showPlatformBilling = false,
  appMode = "saas",
  productIntent = "both",
}: AppSidebarProps) {
  const pathname = usePathname();
  const isMarketplace = appMode === "marketplace";
  const activeProduct = productForMode(appMode);
  const navGroups = useMemo(() => {
    if (isMarketplace) return marketplaceNavGroups;
    return filterNavGroupsForRole(memberRole, navOverrides);
  }, [isMarketplace, memberRole, navOverrides]);
  const showSettingsLink =
    !isMarketplace &&
    navGroups.some((g) => g.items.some((item) => item.href === "/settings"));
  const showMarketplaceAccountLink = isMarketplace;
  const myWorkActive = Boolean(
    !isMarketplace &&
      myStaffHref &&
      (pathname === myStaffHref || pathname.startsWith(`${myStaffHref}/`))
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--m-ink)] ring-1 ring-sidebar-border">
              <BeautoraLogo size="sm" className="size-7" />
            </div>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold text-foreground">{organizationName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {activeProduct.name} · {activeProduct.tagline}
              </p>
            </div>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[min(100vw-2rem,20rem)]">
            <DropdownMenuItem disabled className="opacity-100">
              <span className="min-w-0 flex-1 space-y-0.5">
                <span className="block truncate text-sm font-semibold">{organizationName}</span>
                <span className="block text-[11px] leading-snug text-muted-foreground whitespace-normal">
                  Active: {activeProduct.name} — {activeProduct.tagline}
                </span>
              </span>
            </DropdownMenuItem>
            <AppModeSwitcherItems mode={appMode} productIntent={productIntent} />
            {showSettingsLink && (
              <DropdownMenuItem>
                <Link href="/settings">Workspace settings</Link>
              </DropdownMenuItem>
            )}
            {showMarketplaceAccountLink && (
              <DropdownMenuItem>
                <Link href="/marketplace/settings">Account settings</Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {!isMarketplace && myStaffHref ? (
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              Me
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={myWorkActive}
                    tooltip="My work"
                    className="h-10 rounded-lg px-2.5 transition-colors duration-150 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[active=true]:[&_svg]:text-sidebar-accent-foreground"
                    render={<Link href={myStaffHref} />}
                  >
                    <UserRound className="size-[18px] shrink-0" />
                    <span className="text-[13px]">My work</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/marketplace" &&
                      pathname.startsWith(`${item.href}/`)) ||
                    (item.href === "/marketplace" && pathname === "/marketplace");
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.title}
                        className="h-10 rounded-lg px-2.5 transition-colors duration-150 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[active=true]:[&_svg]:text-sidebar-accent-foreground"
                        render={
                          <Link
                            href={item.href}
                            target={item.href === "/shop" ? "_blank" : undefined}
                          />
                        }
                      >
                        <item.icon className="size-[18px] shrink-0" />
                        <span className="text-[13px]">{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        {showPlatformBilling && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              Beautora
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={pathname.startsWith("/platform")}
                    tooltip="Platform admin"
                    className="h-10 rounded-lg px-2.5"
                    render={<Link href="/platform" />}
                  >
                    <Wallet className="size-[18px] shrink-0" />
                    <span className="text-[13px]">Platform admin</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <UserMenu
          email={userEmail}
          role={userRole}
          variant="sidebar"
          fallback={getInitials(userEmail ?? organizationName)}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
