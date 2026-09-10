"use client";

import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { getPageTitle } from "@/lib/navigation";
import { getInitials } from "@/lib/format";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotificationBell } from "@/components/layout/notification-bell";
import { UserMenu } from "@/components/layout/user-menu";
import { GettingStartedGuide } from "@/components/guide/getting-started-guide";

type AppHeaderProps = {
  userEmail?: string;
  userRole?: string;
  organizationName?: string;
};

export function AppHeader({ userEmail, userRole, organizationName }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const pageTitle = getPageTitle(pathname);

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const q = new FormData(form).get("q") as string;
    if (q?.trim()) {
      router.push(`/customers?search=${encodeURIComponent(q.trim())}`);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card/90 px-3 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md supports-[backdrop-filter]:bg-card/70 sm:gap-3 sm:px-6">
      <SidebarTrigger className="touch-target -ml-0.5 size-11 sm:size-9" />
      <Separator orientation="vertical" className="hidden h-4 sm:block" />

      <div className="min-w-0 shrink">
        <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">{pageTitle}</h1>
        {organizationName && pathname !== "/dashboard" ? (
          <p className="hidden truncate text-xs text-muted-foreground sm:block">{organizationName}</p>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:justify-center sm:gap-3">
        <GettingStartedGuide className="shrink-0" />

        <form
          onSubmit={handleSearch}
          className="hidden max-w-sm flex-1 md:flex md:max-w-xs lg:max-w-md"
        >
          <div className="relative w-full">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              placeholder="Search customers, appointments…"
              className="h-9 rounded-lg border-border bg-muted/50 pl-9 text-sm transition-colors focus:bg-background"
            />
          </div>
        </form>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="touch-target size-11 md:hidden"
          aria-label="Search"
          onClick={() => router.push("/customers")}
        >
          <Search className="size-4" />
        </Button>
        <NotificationBell />
        <UserMenu
          email={userEmail}
          role={userRole}
          fallback={getInitials(userEmail ?? organizationName ?? "U")}
          variant="header"
        />
      </div>
    </header>
  );
}
