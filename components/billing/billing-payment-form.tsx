"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";
import { notify } from "@/lib/toast";
import { submitSubscriptionPayment } from "@/lib/actions/billing";
import {
  formatPlanAmount,
  type BillingPlan,
} from "@/lib/billing/subscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MAX_INVOICE_BYTES = 5 * 1024 * 1024;

export function BillingPaymentForm({ plan }: { plan: BillingPlan }) {
  const router = useRouter();
  const [transactionRef, setTransactionRef] = useState("");
  const [payerName, setPayerName] = useState("");
  const [notes, setNotes] = useState("");
  const [invoice, setInvoice] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const amountLabel = formatPlanAmount(plan);

  async function copyDestination() {
    try {
      await navigator.clipboard.writeText(plan.destination);
      setCopied(true);
      notify.success("USDT wallet copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      notify.error("Could not copy — select and copy manually");
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!invoice) {
      notify.error("Upload your payment screenshot / proof");
      return;
    }
    if (invoice.size > MAX_INVOICE_BYTES) {
      notify.error("Invoice must be 5 MB or smaller");
      return;
    }

    setLoading(true);
    const result = await submitSubscriptionPayment({
      transactionRef,
      payerName,
      notes,
      invoice,
    });
    setLoading(false);
    if (result.error) {
      notify.error(result.error);
      return;
    }
    notify.success("Payment submitted — Beautora will verify and re-enable your store.");
    setTransactionRef("");
    setPayerName("");
    setNotes("");
    setInvoice(null);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-4 text-sm">
        <p className="font-semibold">Send {amountLabel} via USDT</p>
        {plan.networkLabel ? (
          <p className="mt-1 text-xs font-medium text-muted-foreground">{plan.networkLabel}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-start gap-2">
          <p className="min-w-0 flex-1 break-all text-muted-foreground">
            Wallet:{" "}
            <span className="font-semibold text-foreground">{plan.destinationDisplay}</span>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => void copyDestination()}
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
          Send only USDT on BNB Smart Chain (BEP-20). Wrong network can lose funds.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          After sending, enter the transaction hash and upload the receipt screenshot below. A
          Beautora admin will approve and unlock your store for 30 days.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="txn">{plan.refLabel}</Label>
        <Input
          id="txn"
          value={transactionRef}
          onChange={(e) => setTransactionRef(e.target.value)}
          placeholder={plan.refPlaceholder}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="invoice">Invoice / payment screenshot</Label>
        <Input
          id="invoice"
          name="invoice"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          required
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            if (!file) {
              setInvoice(null);
              return;
            }
            if (file.size > MAX_INVOICE_BYTES) {
              setInvoice(null);
              notify.error("Invoice must be 5 MB or smaller");
              e.target.value = "";
              return;
            }
            setInvoice(file);
          }}
          className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
        />
        <p className="text-xs text-muted-foreground">{plan.proofHint}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="payer">Payer name (optional)</Label>
        <Input
          id="payer"
          value={payerName}
          onChange={(e) => setPayerName(e.target.value)}
          placeholder="Name or wallet label"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything that helps verify the transfer"
          rows={3}
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full sm:w-auto">
        {loading ? "Submitting…" : "Submit payment proof"}
      </Button>
    </form>
  );
}
