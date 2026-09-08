"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Plus, ShoppingCart, UserPlus, Package, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { canAccessPath, type NavPermissionsConfig } from "@/lib/permissions/nav";
import type { MemberRole } from "@/types";

const actions = [
  { label: "New Appointment", href: "/appointments/new", icon: Calendar, shortcut: "A" },
  { label: "New Customer", href: "/customers/new", icon: UserPlus, shortcut: "C" },
  { label: "New Sale", href: "/pos", icon: ShoppingCart, shortcut: "S" },
  { label: "Add Product", href: "/products", icon: Package, shortcut: "P" },
] as const;

type QuickActionFabProps = {
  memberRole: MemberRole;
  navOverrides: NavPermissionsConfig;
};

export function QuickActionFab({ memberRole, navOverrides }: QuickActionFabProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const visibleActions = useMemo(
    () => actions.filter((action) => canAccessPath(memberRole, action.href, navOverrides)),
    [memberRole, navOverrides]
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!e.altKey) return;

      const map: Record<string, string> = {
        a: "/appointments/new",
        c: "/customers/new",
        s: "/pos",
        p: "/products",
      };
      const href = map[e.key.toLowerCase()];
      if (href && canAccessPath(memberRole, href, navOverrides)) {
        e.preventDefault();
        router.push(href);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, memberRole, navOverrides]);

  if (visibleActions.length === 0) return null;

  return (
    <div className="app-fab fixed z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="mb-1 max-h-[min(70vh,24rem)] w-[min(100vw-2rem,18rem)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-card p-2 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          {visibleActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <action.icon className="size-4 shrink-0 text-primary" />
              <span className="flex-1">{action.label}</span>
              <kbd className="ml-auto hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground md:inline">
                Alt+{action.shortcut}
              </kbd>
            </Link>
          ))}
        </div>
      )}

      <Button
        size="icon-lg"
        className={cn(
          "size-14 rounded-full shadow-lg transition-transform duration-200 hover:scale-105 sm:size-12",
          open && "rotate-45"
        )}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close quick actions" : "Open quick actions"}
      >
        {open ? <X className="size-5" /> : <Plus className="size-5" />}
      </Button>
    </div>
  );
}
