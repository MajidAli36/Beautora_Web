"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { notify } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import type { PlatformStoreRow } from "@/lib/actions/platform-admin";
import {
  reviewSubscriptionPayment,
  type BillingPaymentRow,
} from "@/lib/actions/billing";
import { CustomerInvoicePreview } from "@/components/billing/customer-invoice-preview";
import { PlatformPartnersPanel } from "@/components/platform/platform-partners-panel";
import { PlatformStoresPanel } from "@/components/platform/platform-stores-panel";
import type { PartnerRow } from "@/lib/actions/partners";
import { PLATFORM_DASHBOARD_PREVIEW } from "@/lib/platform/dashboard-preview";
import { SUBSCRIPTION } from "@/lib/billing/subscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PlatformAdminPanel({
  stores,
  storesTotal,
  payments,
  partners,
  summary,
  adminEmail,
}: {
  stores: PlatformStoreRow[];
  /** Full store count (dashboard may pass a top-10 preview in `stores`). */
  storesTotal?: number;
  payments: BillingPaymentRow[];
  partners: PartnerRow[];
  summary: {
    storeCount: number;
    disabledCount: number;
    lifetimeCount: number;
    pendingInvoices: number;
    pendingPartners: number;
    monthlyFee: number;
  };
  adminEmail: string;
}) {
  const router = useRouter();
  const [busyPay, setBusyPay] = useState<string | null>(null);
  const [payFilter, setPayFilter] = useState<"pending" | "all">(
    summary.pendingInvoices > 0 ? "pending" : "all"
  );
  const [signingOut, setSigningOut] = useState(false);

  const visiblePayments = useMemo(
    () =>
      payFilter === "pending"
        ? payments.filter((p) => p.status === "pending")
        : payments,
    [payments, payFilter]
  );

  async function review(paymentId: string, decision: "approved" | "rejected") {
    setBusyPay(paymentId);
    const result = await reviewSubscriptionPayment({ paymentId, decision });
    setBusyPay(null);
    if (result.error) {
      notify.error(result.error);
      return;
    }
    notify.success(decision === "approved" ? "Approved — store unlocked 30 days" : "Rejected");
    router.refresh();
  }

  async function signOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            SyncOps · Beautora
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Platform admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {adminEmail} · Asia ${SUBSCRIPTION.asiaAmountUsd} · Elsewhere $
            {SUBSCRIPTION.usdtAmountUsd} (USDT BEP-20)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" render={<Link href="/" />}>
            Marketing site
          </Button>
          <Button variant="outline" size="sm" disabled={signingOut} onClick={signOut}>
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Stores" value={String(summary.storeCount)} />
        <Stat label="Lifetime" value={String(summary.lifetimeCount)} />
        <Stat label="Disabled / locked" value={String(summary.disabledCount)} />
        <Stat label="Pending invoices" value={String(summary.pendingInvoices)} />
        <Stat label="Pending partners" value={String(summary.pendingPartners)} />
      </div>

      {summary.pendingInvoices > 0 ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          <strong>{summary.pendingInvoices}</strong> payment proof
          {summary.pendingInvoices === 1 ? "" : "s"} waiting for review (USDT). Scroll to
          Customer invoices below — an email was also sent to platform admin when each was submitted.
        </div>
      ) : null}

      <PlatformStoresPanel
        stores={stores}
        storesTotal={storesTotal}
        previewLimit={PLATFORM_DASHBOARD_PREVIEW}
        viewAllHref="/platform/stores"
      />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Customer invoices</h2>
            <p className="text-sm text-muted-foreground">
              USDT BEP-20 proofs from store owners — transaction ID + uploaded screenshot/PDF.
              You get an email when a new proof arrives. Amount is $
              {SUBSCRIPTION.asiaAmountUsd} (Asia) or ${SUBSCRIPTION.usdtAmountUsd} (elsewhere).
            </p>
          </div>
          <div className="flex gap-2">
            <FilterChip
              active={payFilter === "pending"}
              onClick={() => setPayFilter("pending")}
              label={`Pending (${summary.pendingInvoices})`}
            />
            <FilterChip
              active={payFilter === "all"}
              onClick={() => setPayFilter("all")}
              label={`All (${payments.length})`}
            />
          </div>
        </div>

        <ul className="space-y-4">
          {visiblePayments.length === 0 ? (
            <li className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">No customer invoices here yet</p>
              <p className="mt-2">
                When a salon submits payment from <span className="font-mono">/billing</span>, you
                will see:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>USDT transaction / reference ID</li>
                <li>
                  Amount (${SUBSCRIPTION.asiaAmountUsd} Asia or $
                  {SUBSCRIPTION.usdtAmountUsd} elsewhere)
                </li>
                <li>Payer name & notes</li>
                <li>Uploaded invoice screenshot or PDF</li>
              </ul>
            </li>
          ) : (
            visiblePayments.map((p) => (
              <li key={p.id} className="rounded-lg border p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold">{p.organization_name}</p>
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
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.organization_city ? `${p.organization_city} · ` : ""}
                      {p.organization_slug ? `/${p.organization_slug}` : ""}
                      {" · submitted "}
                      {new Date(p.created_at).toLocaleString("en-PK")}
                    </p>
                  </div>
                  {p.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={busyPay === p.id}
                        onClick={() => review(p.id, "approved")}
                      >
                        Approve & enable 30 days
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyPay === p.id}
                        onClick={() => review(p.id, "rejected")}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>

                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <Detail
                    label={
                      p.payment_method === "usdt_bep20"
                        ? "USDT transaction hash"
                        : "JazzCash transaction ID"
                    }
                    value={p.transaction_ref}
                    mono
                  />
                  <Detail
                    label="Amount paid"
                    value={
                      p.currency === "USD" || p.payment_method === "usdt_bep20"
                        ? `$${Number(p.amount).toLocaleString("en-US")} USDT`
                        : `${SUBSCRIPTION.currencyLabel} ${Number(p.amount).toLocaleString("en-PK")}`
                    }
                  />
                  <Detail
                    label={
                      p.payment_method === "usdt_bep20"
                        ? "USDT wallet (BEP-20)"
                        : "Sent to JazzCash"
                    }
                    value={p.jazzcash_number || SUBSCRIPTION.jazzcashDisplay}
                    mono
                  />
                  <Detail
                    label="Method"
                    value={
                      p.payment_method === "usdt_bep20"
                        ? "USDT · BNB Smart Chain"
                        : "JazzCash · Pakistan"
                    }
                  />
                  <Detail label="Payer name" value={p.payer_name || "—"} />
                  {p.organization_country ? (
                    <Detail label="Store country" value={p.organization_country} />
                  ) : null}
                  {p.notes && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Customer notes
                      </dt>
                      <dd className="mt-1 whitespace-pre-wrap">{p.notes}</dd>
                    </div>
                  )}
                  {p.reviewed_at && (
                    <Detail
                      label="Reviewed"
                      value={`${new Date(p.reviewed_at).toLocaleString("en-PK")}${
                        p.review_notes ? ` · ${p.review_notes}` : ""
                      }`}
                    />
                  )}
                </dl>

                <div className="mt-4 border-t pt-4">
                  {p.has_invoice ? (
                    <CustomerInvoicePreview paymentId={p.id} mime={p.invoice_mime} />
                  ) : (
                    <p className="text-sm text-amber-700">
                      No invoice file attached to this submission.
                    </p>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <PlatformPartnersPanel
        partners={partners}
        previewLimit={PLATFORM_DASHBOARD_PREVIEW}
        viewAllHref="/platform/partners"
      />
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
  note,
}: {
  label: string;
  value: string;
  mono?: boolean;
  note?: string | null;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={cn("mt-1 break-all font-medium", mono && "font-mono text-sm")}>{value}</dd>
      {note ? <p className="mt-0.5 text-[11px] text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center px-3 text-xs font-medium",
        active ? "bg-foreground text-background" : "border text-muted-foreground"
      )}
    >
      {label}
    </button>
  );
}
