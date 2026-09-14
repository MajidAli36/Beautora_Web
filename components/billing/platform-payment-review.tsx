"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import {
  reviewSubscriptionPayment,
  type BillingPaymentRow,
} from "@/lib/actions/billing";
import { ViewSubscriptionInvoiceButton } from "@/components/billing/view-subscription-invoice-button";
import { SUBSCRIPTION } from "@/lib/billing/subscription";
import { Button } from "@/components/ui/button";
import { PaginatedList } from "@/components/ui/table-pagination";

export function PlatformPaymentReview({
  payments,
}: {
  payments: BillingPaymentRow[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function review(paymentId: string, decision: "approved" | "rejected") {
    setBusyId(paymentId);
    const result = await reviewSubscriptionPayment({ paymentId, decision });
    setBusyId(null);
    if (result.error) {
      notify.error(result.error);
      return;
    }
    notify.success(
      decision === "approved"
        ? "Payment approved — store re-enabled for 30 days"
        : "Payment rejected"
    );
    router.refresh();
  }

  return (
    <PaginatedList
      items={payments}
      empty={<p className="text-sm text-muted-foreground">No pending JazzCash payments.</p>}
      search={{
        placeholder: "Search store, ref, payer…",
        getText: (p) =>
          [
            p.organization_name ?? "",
            p.organization_slug ?? "",
            p.transaction_ref,
            p.payer_name ?? "",
            p.notes ?? "",
            p.jazzcash_number,
            String(p.amount),
            p.status,
          ].join(" "),
      }}
    >
      {(slice) => (
        <ul className="space-y-4">
          {slice.map((p) => (
            <li key={p.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div>
                    <p className="font-semibold">{p.organization_name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Ref <span className="font-medium text-foreground">{p.transaction_ref}</span>
                      {" · "}
                      {SUBSCRIPTION.currencyLabel} {Number(p.amount).toLocaleString("en-PK")}
                      {" · "}
                      JazzCash {p.jazzcash_number}
                    </p>
                    {p.payer_name && (
                      <p className="text-sm text-muted-foreground">Payer: {p.payer_name}</p>
                    )}
                    {p.notes && <p className="mt-1 text-sm">{p.notes}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Submitted {new Date(p.created_at).toLocaleString("en-PK")}
                    </p>
                  </div>
                  {p.has_invoice ? (
                    <ViewSubscriptionInvoiceButton paymentId={p.id} />
                  ) : (
                    <p className="text-xs text-amber-700">No invoice uploaded</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={busyId === p.id}
                    onClick={() => review(p.id, "approved")}
                  >
                    Approve & enable
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === p.id}
                    onClick={() => review(p.id, "rejected")}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PaginatedList>
  );
}
