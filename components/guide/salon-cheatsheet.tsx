"use client";

import { useMemo, useState } from "react";
import { Calculator, Equal, ScrollText } from "lucide-react";
import { getCheatsheetSections } from "@/lib/guide/cheatsheet";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type SalonCheatsheetProps = {
  className?: string;
  /** When true, hide JazzCash/USDT pay copy — store has lifetime access. */
  hasLifetimeAccess?: boolean;
};

export function SalonCheatsheet({
  className,
  hasLifetimeAccess = false,
}: SalonCheatsheetProps) {
  const sections = useMemo(
    () => getCheatsheetSections({ hasLifetimeAccess }),
    [hasLifetimeAccess]
  );
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "overview");

  const section = useMemo(
    () => sections.find((s) => s.id === activeId) ?? sections[0],
    [activeId, sections]
  );
  const activeIndex = Math.max(
    0,
    sections.findIndex((s) => s.id === activeId)
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          "h-9 shrink-0 gap-1.5 rounded-lg border-border bg-background px-2 text-foreground hover:bg-muted sm:px-2.5",
          className
        )}
        aria-label="Open salon cheatsheet"
        onClick={() => setOpen(true)}
      >
        <ScrollText className="size-3.5 shrink-0" />
        <span className="hidden text-xs font-semibold tracking-wide sm:inline">Cheatsheet</span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          showCloseButton
          className="w-full gap-0 overflow-hidden border-l border-border/80 p-0 shadow-2xl sm:max-w-3xl"
        >
          <SheetHeader className="relative overflow-hidden border-b border-border/80 bg-[linear-gradient(145deg,color-mix(in_oklab,var(--primary)_14%,transparent)_0%,transparent_55%),linear-gradient(180deg,var(--muted)_0%,var(--background)_100%)] px-5 pt-5 pb-4 pr-12">
            <div
              className="pointer-events-none absolute -top-16 -right-10 size-44 rounded-full bg-primary/10 blur-3xl"
              aria-hidden
            />
            <p className="relative flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              <Calculator className="size-3.5" />
              Calculations
            </p>
            <SheetTitle className="relative text-xl font-semibold tracking-tight sm:text-2xl">
              Salon cheatsheet
            </SheetTitle>
            <SheetDescription className="relative max-w-lg text-sm leading-relaxed">
              How Dashboard, Reports, Finances, POS, inventory, and billing numbers are built —
              so everyone on the floor reads the same story.
            </SheetDescription>
            <p className="relative mt-3 text-[11px] font-medium text-muted-foreground">
              Topic {activeIndex + 1} of {sections.length}
            </p>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
            <nav
              className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-border p-3 sm:w-44 sm:flex-col sm:overflow-y-auto sm:border-r sm:border-b-0 sm:bg-muted/20"
              aria-label="Cheatsheet topics"
            >
              {sections.map((s, i) => {
                const active = activeId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveId(s.id)}
                    className={cn(
                      "shrink-0 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-colors sm:w-full",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span className="mr-1.5 opacity-60">{i + 1}.</span>
                    {s.label}
                  </button>
                );
              })}
            </nav>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {section ? (
                <div className="mx-auto max-w-lg space-y-5">
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">
                      {section.label}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {section.intro}
                    </p>
                  </div>

                  <ul className="space-y-3">
                    {section.items.map((item) => (
                      <li
                        key={item.title}
                        className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm ring-1 ring-black/[0.02]"
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Equal className="size-3.5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground">{item.title}</p>
                            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                              {item.body}
                            </p>
                            {item.formula ? (
                              <p className="mt-3 rounded-xl border border-dashed border-primary/25 bg-primary/[0.04] px-3 py-2.5 font-mono text-[11px] leading-relaxed text-foreground">
                                {item.formula}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
