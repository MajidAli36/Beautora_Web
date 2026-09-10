"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { GUIDE_STEPS } from "@/lib/guide/steps";
import {
  consumeGuideAutoOpen,
  markGuideCompleted,
  markGuideShownThisSession,
  shouldAutoOpenGuideOnDashboard,
} from "@/lib/guide/storage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    // Defer so the dashboard paints first, then the walkthrough appears.
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

      <Dialog
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
        <DialogContent
          className="gap-0 overflow-hidden p-0 sm:max-w-lg"
          showCloseButton
        >
          <div className="border-b border-border bg-gradient-to-br from-primary/12 via-background to-background px-5 pt-5 pb-4">
            <DialogHeader className="gap-1.5">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                <Sparkles className="size-3.5" />
                Getting started
              </p>
              <DialogTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                How to use your salon app
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Follow these {GUIDE_STEPS.length} steps — set up catalog, serve guests,
                then review results.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 flex flex-wrap gap-1.5" aria-hidden>
              {GUIDE_STEPS.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className={cn(
                    "h-1.5 flex-1 min-w-6 rounded-full transition-colors",
                    i <= stepIndex ? "bg-primary" : "bg-muted"
                  )}
                  onClick={() => setStepIndex(i)}
                  aria-label={`Go to step ${i + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4 px-5 py-5">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Step {stepIndex + 1} of {GUIDE_STEPS.length}
                </p>
                <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm font-medium text-primary/90">{step.summary}</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{step.detail}</p>

            <Button
              variant="secondary"
              className="w-full justify-between"
              render={<Link href={step.href} onClick={() => closeGuide(false)} />}
            >
              {step.cta}
              <ChevronRight className="size-4 opacity-70" />
            </Button>
          </div>

          <DialogFooter className="mx-0 mb-0 gap-2 border-t bg-muted/40 p-4 sm:justify-between">
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
                disabled={isFirst}
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              >
                <ChevronLeft className="size-4" />
                Back
              </Button>
              {isLast ? (
                <Button type="button" onClick={() => closeGuide(true)}>
                  Finish guide
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() =>
                    setStepIndex((i) => Math.min(GUIDE_STEPS.length - 1, i + 1))
                  }
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
