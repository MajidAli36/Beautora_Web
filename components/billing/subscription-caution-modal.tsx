"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Wallet } from "lucide-react";
import { BillingPaymentForm } from "@/components/billing/billing-payment-form";
import {
  formatPlanAmount,
  SUBSCRIPTION,
  type SubscriptionSnapshot,
} from "@/lib/billing/subscription";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "beautora_billing_caution_last_shown";

type SubscriptionCautionModalProps = {
  snapshot: SubscriptionSnapshot;
  orgName: string;
};

export function SubscriptionCautionModal({
  snapshot,
  orgName,
}: SubscriptionCautionModalProps) {
  const isLocked = snapshot.phase === "locked";
  const isGrace = snapshot.phase === "grace";
  const isLifetime = snapshot.phase === "lifetime" || snapshot.lifetimeAccess;
  const [open, setOpen] = useState(isLocked && !isLifetime);
  const plan = snapshot.plan;
  const amountLabel = formatPlanAmount(plan);
  useEffect(() => {
    if (isLifetime) {
      setOpen(false);
      return;
    }
    if (isLocked) {
      setOpen(true);
      return;
    }
    if (!isGrace) return;

    function maybeShow() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const last = raw ? Number(raw) : 0;
        const due = !last || Date.now() - last >= SUBSCRIPTION.cautionPopupIntervalMs;
        if (due) {
          setOpen(true);
          localStorage.setItem(STORAGE_KEY, String(Date.now()));
        }
      } catch {
        setOpen(true);
      }
    }

    maybeShow();
    const id = window.setInterval(maybeShow, SUBSCRIPTION.cautionPopupIntervalMs);
    return () => window.clearInterval(id);
  }, [isLocked, isGrace, isLifetime]);

  if (isLifetime || (!isGrace && !isLocked)) return null;

  const hours = snapshot.hoursLeftInGrace ?? 0;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        // Locked stores must stay on the payment drawer until unlocked.
        if (!next && isLocked) return;
        setOpen(next);
      }}
    >
      <SheetContent
        side="right"
        showCloseButton={!isLocked}
        className="z-[100] w-full gap-0 overflow-y-auto p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b border-border px-5 py-5 pr-12">
          <div
            className={
              isLocked
                ? "flex size-11 items-center justify-center rounded-xl bg-destructive/15 text-destructive"
                : "flex size-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700"
            }
          >
            <AlertTriangle className="size-5" />
          </div>
          <SheetTitle className="mt-3 text-xl font-semibold tracking-tight">
            {isLocked ? `Store paused — ${orgName}` : `Subscription caution — ${orgName}`}
          </SheetTitle>
          <SheetDescription className="text-sm leading-relaxed">
            {isLocked ? (
              <>
                Access is disabled until Beautora confirms your USDT payment. Send{" "}
                <strong className="text-foreground">{amountLabel}</strong> and submit proof
                below to re-enable the salon for 30 days.
              </>
            ) : (
              <>
                Your free trial has ended. You have{" "}
                <strong className="text-foreground">
                  {hours} hour{hours === 1 ? "" : "s"}
                </strong>{" "}
                left in the 3-day grace period. The salon stays open during this warning window —
                then access pauses until payment is confirmed.
              </>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-5 py-5">
          {!isLocked && (
            <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-4 text-sm">
              <p className="font-medium text-foreground">Renew: {amountLabel}/month</p>
              <p className="break-all text-muted-foreground">
                USDT wallet:{" "}
                <span className="font-semibold text-foreground">{plan.destinationDisplay}</span>
              </p>
              {plan.networkLabel ? (
                <p className="text-xs text-muted-foreground">{plan.networkLabel}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                This reminder shows at most once per hour during the grace period.
              </p>
            </div>
          )}

          {isLocked ? (
            <div>
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                This payment reminder stays open until your store is re-enabled.
              </p>
              <BillingPaymentForm plan={plan} />
            </div>
          ) : null}
        </div>

        {!isLocked ? (
          <SheetFooter className="flex-row flex-wrap gap-2 border-t border-border bg-muted/30 p-4 sm:space-y-0">
            <Button render={<Link href="/billing" />} className="flex-1 gap-2">
              <Wallet className="size-4" />
              Pay & submit proof
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Remind me later
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
