"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Wallet, X } from "lucide-react";
import { BillingPaymentForm } from "@/components/billing/billing-payment-form";
import { SUBSCRIPTION, type SubscriptionSnapshot } from "@/lib/billing/subscription";

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

  if (isLifetime || !open || (!isGrace && !isLocked)) return null;

  const hours = snapshot.hoursLeftInGrace ?? 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="billing-caution-title"
        className={`relative w-full border border-border bg-card p-6 shadow-xl ${
          isLocked ? "max-h-[90vh] max-w-lg overflow-y-auto" : "max-w-md"
        }`}
      >
        {!isLocked && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-3 right-3 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        )}

        <div
          className={
            isLocked
              ? "flex size-11 items-center justify-center bg-destructive/15 text-destructive"
              : "flex size-11 items-center justify-center bg-amber-500/15 text-amber-700"
          }
        >
          <AlertTriangle className="size-5" />
        </div>

        <h2
          id="billing-caution-title"
          className="mt-4 text-xl font-semibold tracking-tight text-foreground"
        >
          {isLocked ? `Store paused — ${orgName}` : `Subscription caution — ${orgName}`}
        </h2>

        {isLocked ? (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Access is disabled until Beautora confirms your JazzCash payment. Send{" "}
            <strong className="text-foreground">
              {SUBSCRIPTION.currencyLabel}{" "}
              {SUBSCRIPTION.monthlyAmountPkr.toLocaleString("en-PK")}
            </strong>{" "}
            and submit proof below to re-enable the salon for 30 days.
          </p>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Your free trial has ended. You have{" "}
            <strong className="text-foreground">
              {hours} hour{hours === 1 ? "" : "s"}
            </strong>{" "}
            left in the 3-day grace period. The salon stays open during this warning window —
            then access pauses until payment is confirmed.
          </p>
        )}

        {!isLocked && (
          <div className="mt-5 space-y-2 border border-border bg-muted/40 p-4 text-sm">
            <p className="font-medium text-foreground">
              Renew: {SUBSCRIPTION.currencyLabel}{" "}
              {SUBSCRIPTION.monthlyAmountPkr.toLocaleString("en-PK")}
              /month
            </p>
            <p className="text-muted-foreground">
              Send JazzCash to{" "}
              <span className="font-semibold text-foreground">
                {SUBSCRIPTION.jazzcashDisplay}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              This reminder shows at most once per hour during the grace period.
            </p>
          </div>
        )}

        {isLocked ? (
          <div className="mt-5">
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              This payment reminder stays on until your store is re-enabled.
            </p>
            <BillingPaymentForm />
          </div>
        ) : (
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/billing"
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Wallet className="size-4" />
              Pay & submit proof
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 items-center border border-border px-4 text-sm font-medium hover:bg-muted"
            >
              Remind me later
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
