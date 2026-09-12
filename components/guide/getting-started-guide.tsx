"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { GUIDE_STEPS } from "@/lib/guide/steps";
import {
  consumeGuideAutoOpen,
  markGuideCompleted,
  markGuideShownThisSession,
  shouldAutoOpenGuideOnDashboard,
} from "@/lib/guide/storage";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type GettingStartedGuideProps = {
  /** Compact header trigger (always visible). */
  className?: string;
};

export function GettingStartedGuide({ className }: GettingStartedGuideProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const autoTried = useRef(false);
  /** True while closeGuide owns the dismiss (skip onOpenChange marking completed). */
  const programmaticClose = useRef(false);

  const openGuide = useCallback((atStep = 0) => {
    setStepIndex(atStep);
    setOpen(true);
  }, []);

  const closeGuide = useCallback((completed: boolean) => {
    programmaticClose.current = true;
    setOpen(false);
    markGuideShownThisSession();
    if (completed) markGuideCompleted();
  }, []);

  useEffect(() => {
    if (autoTried.current) return;
    if (pathname !== "/dashboard") return;
    const timer = window.setTimeout(() => {
      if (!shouldAutoOpenGuideOnDashboard()) return;
      if (!consumeGuideAutoOpen()) return;
      autoTried.current = true;
      markGuideShownThisSession();
      openGuide(0);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [pathname, openGuide]);

  const step = GUIDE_STEPS[stepIndex] ?? GUIDE_STEPS[0];
  const Icon = step.icon;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === GUIDE_STEPS.length - 1;
  const progress = ((stepIndex + 1) / GUIDE_STEPS.length) * 100;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          "h-9 shrink-0 gap-1.5 rounded-lg border-primary/25 bg-primary/5 px-2.5 text-primary hover:bg-primary/10 hover:text-primary",
          className
        )}
        aria-label="Open Getting Started guide"
        onClick={() => openGuide(0)}
      >
        <BookOpen className="size-3.5" />
        <span className="text-xs font-semibold tracking-wide">Guide</span>
      </Button>

      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            if (programmaticClose.current) {
              programmaticClose.current = false;
              return;
            }
            closeGuide(true);
          } else {
            setOpen(true);
          }
        }}
      >
        <SheetContent
          side="right"
          showCloseButton
          className="w-full gap-0 overflow-hidden border-l border-border/80 p-0 shadow-2xl sm:max-w-3xl"
        >
          <SheetHeader className="relative overflow-hidden border-b border-border/80 bg-[linear-gradient(145deg,color-mix(in_oklab,var(--primary)_16%,transparent)_0%,transparent_55%),linear-gradient(180deg,var(--muted)_0%,var(--background)_100%)] px-5 pt-5 pb-4 pr-12">
            <div
              className="pointer-events-none absolute -top-16 -right-10 size-44 rounded-full bg-primary/10 blur-3xl"
              aria-hidden
            />
            <p className="relative flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="size-3.5" />
              Getting started
            </p>
            <SheetTitle className="relative text-xl font-semibold tracking-tight sm:text-2xl">
              How to use your salon app
            </SheetTitle>
            <SheetDescription className="relative max-w-lg text-sm leading-relaxed">
              Walk through {GUIDE_STEPS.length} steps — set up catalog, serve guests, then review
              results. Jump any step from the list.
            </SheetDescription>

            <div className="relative mt-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                <span>
                  Step {stepIndex + 1} of {GUIDE_STEPS.length}
                </span>
                <span>{Math.round(progress)}% complete</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
            <nav
              className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-border p-3 sm:w-52 sm:flex-col sm:overflow-y-auto sm:border-r sm:border-b-0 sm:bg-muted/20"
              aria-label="Guide steps"
            >
              {GUIDE_STEPS.map((s, i) => {
                const StepIcon = s.icon;
                const active = i === stepIndex;
                const done = i < stepIndex;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStepIndex(i)}
                    className={cn(
                      "flex shrink-0 items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors sm:w-full",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : done
                          ? "bg-primary/8 text-foreground hover:bg-primary/12"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold",
                        active
                          ? "bg-primary-foreground/15"
                          : done
                            ? "bg-primary/15 text-primary"
                            : "bg-muted"
                      )}
                    >
                      {done ? <Check className="size-3.5" /> : <StepIcon className="size-3.5" />}
                    </span>
                    <span className="hidden min-w-0 flex-1 sm:block">
                      <span className="block truncate text-xs font-semibold leading-tight">
                        {s.title.replace(/^\d+\.\s*/, "")}
                      </span>
                    </span>
                    <span className="text-xs font-semibold sm:hidden">{i + 1}</span>
                  </button>
                );
              })}
            </nav>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <div className="mx-auto max-w-md space-y-5">
                <div className="flex items-start gap-4">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                    <Icon className="size-6" />
                  </div>
                  <div className="min-w-0 space-y-1.5 pt-0.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                      Step {stepIndex + 1}
                    </p>
                    <h3 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                      {step.title.replace(/^\d+\.\s*/, "")}
                    </h3>
                    <p className="text-sm font-medium text-foreground/80">{step.summary}</p>
                  </div>
                </div>

                <p className="text-sm leading-relaxed text-muted-foreground">{step.detail}</p>

                <Button
                  className="h-11 w-full justify-between rounded-xl text-sm font-semibold"
                  render={<Link href={step.href} onClick={() => closeGuide(false)} />}
                >
                  {step.cta}
                  <ChevronRight className="size-4 opacity-80" />
                </Button>
              </div>
            </div>
          </div>

          <SheetFooter className="flex-row flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/30 p-4 sm:space-y-0">
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => closeGuide(true)}
            >
              Skip for now
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={isFirst}
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              >
                <ChevronLeft className="size-4" />
                Back
              </Button>
              {isLast ? (
                <Button
                  type="button"
                  className="rounded-xl"
                  onClick={() => closeGuide(true)}
                >
                  Finish guide
                </Button>
              ) : (
                <Button
                  type="button"
                  className="rounded-xl"
                  onClick={() =>
                    setStepIndex((i) => Math.min(GUIDE_STEPS.length - 1, i + 1))
                  }
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              )}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
