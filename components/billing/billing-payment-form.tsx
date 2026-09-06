"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import { submitSubscriptionPayment } from "@/lib/actions/billing";
import { SUBSCRIPTION } from "@/lib/billing/subscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MAX_INVOICE_BYTES = 5 * 1024 * 1024;

export function BillingPaymentForm() {
  const router = useRouter();
  const [transactionRef, setTransactionRef] = useState("");
  const [payerName, setPayerName] = useState("");
  const [notes, setNotes] = useState("");
  const [invoice, setInvoice] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!invoice) {
      notify.error("Upload your JazzCash invoice / payment screenshot");
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
        <p className="font-semibold">
          Send {SUBSCRIPTION.currencyLabel}{" "}
          {SUBSCRIPTION.monthlyAmountPkr.toLocaleString("en-PK")} via JazzCash
        </p>
        <p className="mt-1 text-muted-foreground">
          Number:{" "}
          <a
            href={`tel:${SUBSCRIPTION.jazzcashNumber}`}
            className="font-semibold text-foreground underline-offset-2 hover:underline"
          >
            {SUBSCRIPTION.jazzcashDisplay}
          </a>
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          After sending, enter the JazzCash transaction ID and upload the receipt screenshot
          below. A Beautora admin will approve and unlock your store for 30 days.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="txn">JazzCash transaction / reference ID</Label>
        <Input
          id="txn"
          value={transactionRef}
          onChange={(e) => setTransactionRef(e.target.value)}
          placeholder="e.g. 1234567890"
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
        <p className="text-xs text-muted-foreground">
          JPG, PNG, WebP, or PDF · max 5 MB. Screenshot of JazzCash confirmation preferred.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="payer">Payer name (optional)</Label>
        <Input
          id="payer"
          value={payerName}
          onChange={(e) => setPayerName(e.target.value)}
          placeholder="Name on JazzCash"
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
