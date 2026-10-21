"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { getPageTitle } from "@/lib/navigation";
import { getInitials } from "@/lib/format";
import type { ProductIntent } from "@/lib/auth/account-types";
import type { AppMode } from "@/lib/marketplace/constants";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppLauncher } from "@/components/layout/app-launcher";
import { NotificationBell } from "@/components/layout/notification-bell";
import { UserMenu } from "@/components/layout/user-menu";

/** Heavy sheet UIs — load after first paint so every app route stays lighter. */
const GettingStartedGuide = dynamic(
  () =>
    import("@/components/guide/getting-started-guide").then((m) => ({
      default: m.GettingStartedGuide,
    })),
  { ssr: false, loading: () => <div className="size-8 shrink-0" aria-hidden /> }
);

const SalonCheatsheet = dynamic(
  () =>
    import("@/components/guide/salon-cheatsheet").then((m) => ({
      default: m.SalonCheatsheet,
    })),
  { ssr: false, loading: () => <div className="size-8 shrink-0" aria-hidden /> }
);

type AppHeaderProps = {
  userEmail?: string;
  userRole?: string;
  organizationName?: string;
  /** Lifetime / complimentary store — cheatsheet must not show pay instructions. */
  hasLifetimeAccess?: boolean;
  appMode?: AppMode;
  productIntent?: ProductIntent | null;
  customerAppEnabled?: boolean;
};

export function AppHeader({
  userEmail,
  userRole,
  organizationName,
  hasLifetimeAccess = false,
  appMode = "saas",
  productIntent = "both",
  customerAppEnabled = false,
}: AppHeaderProps) {
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
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-1.5 border-b border-border bg-card/95 px-2 pt-[env(safe-area-inset-top,0px)] sm:h-16 sm:gap-3 sm:bg-card/90 sm:px-6 sm:backdrop-blur-md sm:supports-[backdrop-filter]:bg-card/70">
      <SidebarTrigger className="touch-target -ml-0.5 size-10 shrink-0 sm:size-9" />
      <AppLauncher
        mode={appMode}
        productIntent={productIntent}
        customerAppEnabled={customerAppEnabled}
      />
      <Separator orientation="vertical" className="hidden h-4 sm:block" />

      {/* Title — capped width so it never collides with guide pills */}
      <div className="min-w-0 max-w-[30%] shrink sm:max-w-none sm:flex-1 md:flex-none">
        <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">
          {pageTitle}
        </h1>
        {organizationName && pathname !== "/dashboard" ? (
          <p className="hidden truncate text-xs text-muted-foreground sm:block">
            {organizationName}
          </p>
        ) : null}
      </div>

      {/* Guide / Cheatsheet — icon-only on narrow phones to stop label overlap */}
      <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
        <GettingStartedGuide className="header-guide-trigger" />
        <SalonCheatsheet
          className="header-cheatsheet-trigger"
          hasLifetimeAccess={hasLifetimeAccess}
        />
      </div>

      <form
        onSubmit={handleSearch}
        className="mx-auto hidden max-w-sm flex-1 md:flex md:max-w-xs lg:max-w-md"
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

      <div className="ml-auto flex shrink-0 items-center gap-0 sm:gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="touch-target size-10 md:hidden"
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
