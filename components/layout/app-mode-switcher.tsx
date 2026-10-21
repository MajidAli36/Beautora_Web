"use client";

import { Check } from "lucide-react";
import type { ProductIntent } from "@/lib/auth/account-types";
import type { AppMode } from "@/lib/marketplace/constants";
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useWorkspaceSwitch } from "@/components/layout/use-workspace-switch";
import { visibleWorkspaces, type WorkspaceDefinition } from "@/lib/workspaces";

export type WorkspaceSwitcherProps = {
  mode: AppMode;
  productIntent?: ProductIntent | null;
  /** Super Admin enabled a customer app for this salon */
  customerAppEnabled?: boolean;
  /** Fired after a successful workspace switch (e.g. close launcher). */
  onSwitched?: () => void;
  /**
   * `sidebar` — items inside the top-left org dropdown (with separators).
   * `launcher` — compact list for the header app launcher (no outer separators).
   */
  variant?: "sidebar" | "launcher";
};

function WorkspaceOption({
  workspace,
  active,
  pending,
  onSelect,
}: {
  workspace: WorkspaceDefinition;
  active: boolean;
  pending: boolean;
  onSelect: () => void;
}) {
  const Icon = workspace.icon;
  return (
    <DropdownMenuItem
      disabled={pending}
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      className={cn(
        "items-start gap-2.5 py-2.5 motion-safe:transition-colors",
        active &&
          "bg-primary/10 text-foreground focus:bg-primary/15 data-[highlighted]:bg-primary/15"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 motion-safe:transition-colors",
          active
            ? "bg-primary/15 text-primary ring-primary/25"
            : "bg-muted text-foreground ring-transparent"
        )}
        aria-hidden
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="flex items-center gap-1.5">
          <span className="text-sm font-semibold">{workspace.name}</span>
          {active ? (
            <Check className="size-3.5 shrink-0 text-primary" aria-hidden />
          ) : null}
          {active ? (
            <span className="sr-only">(current workspace)</span>
          ) : null}
        </span>
        <span className="block text-[11px] leading-snug text-muted-foreground whitespace-normal">
          {workspace.switcherDescription}
        </span>
      </span>
    </DropdownMenuItem>
  );
}

/** Shared workspace list — used by sidebar dropdown and header app launcher. */
export function AppModeSwitcherItems({
  mode,
  productIntent = "both",
  customerAppEnabled = false,
  onSwitched,
  variant = "sidebar",
}: WorkspaceSwitcherProps) {
  const { pending, switchTo } = useWorkspaceSwitch({
    mode,
    productIntent,
    customerAppEnabled,
    onSwitched,
  });

  const visible = visibleWorkspaces({ productIntent, customerAppEnabled });
  const isLauncher = variant === "launcher";

  if (visible.length <= 1 && !customerAppEnabled) {
    const lockedCopy =
      productIntent === "marketplace"
        ? "Marketplace only — configured at signup"
        : "Salon POS only — configured at signup";

    return (
      <>
        {!isLauncher ? <DropdownMenuSeparator /> : null}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="space-y-0.5 px-1.5 py-2">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Workspace
            </span>
            <span className="block text-xs font-medium leading-snug text-foreground/80 normal-case tracking-normal">
              {lockedCopy}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        {!isLauncher ? <DropdownMenuSeparator /> : null}
      </>
    );
  }

  return (
    <>
      {!isLauncher ? <DropdownMenuSeparator /> : null}
      <DropdownMenuGroup>
        <DropdownMenuLabel className="space-y-0.5 px-1.5 py-2">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {isLauncher ? "Apps" : "Switch workspace"}
          </span>
          <span className="block text-xs font-medium leading-snug text-foreground/80 normal-case tracking-normal">
            Salon POS · Marketplace
            {customerAppEnabled ? " · App dashboard" : ""}
          </span>
        </DropdownMenuLabel>

        {visible.map((workspace) => (
          <WorkspaceOption
            key={workspace.id}
            workspace={workspace}
            active={mode === workspace.id}
            pending={pending}
            onSelect={() => switchTo(workspace.id)}
          />
        ))}

        {!customerAppEnabled ? (
          <p className="px-2 py-2 text-[11px] leading-snug text-muted-foreground">
            App dashboard appears here after Super Admin enables Customer apps for your
            salon.
          </p>
        ) : null}
      </DropdownMenuGroup>
      {!isLauncher ? <DropdownMenuSeparator /> : null}
    </>
  );
}
