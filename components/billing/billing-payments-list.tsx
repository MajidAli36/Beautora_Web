"use client";

import { ViewSubscriptionInvoiceButton } from "@/components/billing/view-subscription-invoice-button";
import { Badge } from "@/components/ui/badge";
import { PaginatedList } from "@/components/ui/table-pagination";
import { formatStoredPaymentAmount } from "@/lib/billing/subscription";

type BillingPayment = {
  id: string;
  transaction_ref: string;
  created_at: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  has_invoice: boolean;
};

export function BillingPaymentsList({ payments }: { payments: BillingPayment[] }) {
  return (
    <PaginatedList
      items={payments}
      empty={<p className="text-sm text-muted-foreground">No payments submitted yet.</p>}
      search={{
        placeholder: "Search ref, method, status…",
        getText: (p) =>
          [
            p.transaction_ref,
            p.status,
            p.payment_method,
            p.payment_method === "usdt_bep20" ? "usdt" : "jazzcash",
            String(p.amount),
            p.currency,
          ].join(" "),
      }}
    >
      {(slice) => (
        <ul className="divide-y text-sm">
          {slice.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="font-medium">Ref {p.transaction_ref}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleString("en-PK")} ·{" "}
                  {formatStoredPaymentAmount(p.amount, p.currency)}
                  {p.payment_method === "usdt_bep20" ? " · USDT" : " · JazzCash"}
                </p>
                {p.has_invoice && (
                  <div className="mt-2">
                    <ViewSubscriptionInvoiceButton paymentId={p.id} />
                  </div>
                )}
              </div>
              <Badge
                variant={
                  p.status === "approved"
                    ? "default"
                    : p.status === "rejected"
                      ? "destructive"
                      : "secondary"
                }
              >
                {p.status}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </PaginatedList>
  );
}
