"use client";

import { useState } from "react";
import { LayoutGrid } from "lucide-react";
import type { ProductIntent } from "@/lib/auth/account-types";
import type { AppMode } from "@/lib/marketplace/constants";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppModeSwitcherItems } from "@/components/layout/app-mode-switcher";
import { getWorkspace } from "@/lib/workspaces";
import { cn } from "@/lib/utils";

type AppLauncherProps = {
  mode: AppMode;
  productIntent?: ProductIntent | null;
  customerAppEnabled?: boolean;
  className?: string;
};

/**
 * Compact header app launcher — same workspace config & switch logic as the
 * top-left sidebar dropdown (single source of truth).
 */
export function AppLauncher({
  mode,
  productIntent = "both",
  customerAppEnabled = false,
  className,
}: AppLauncherProps) {
  const [open, setOpen] = useState(false);
  const active = getWorkspace(mode);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "touch-target relative size-10 shrink-0 sm:size-9",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring",
              className
            )}
            aria-label={`Open app launcher. Current workspace: ${active.name}`}
          />
        }
      >
        <LayoutGrid className="size-4" aria-hidden />
        <span
          className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary ring-2 ring-card"
          aria-hidden
        />
        <span className="sr-only">{active.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="bottom"
        sideOffset={6}
        className={cn(
          "z-50 w-[min(100vw-2rem,20rem)] min-w-[18rem]",
          "motion-reduce:data-open:animate-none motion-reduce:data-closed:animate-none"
        )}
      >
        <AppModeSwitcherItems
          mode={mode}
          productIntent={productIntent}
          customerAppEnabled={customerAppEnabled}
          variant="launcher"
          onSwitched={() => setOpen(false)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
