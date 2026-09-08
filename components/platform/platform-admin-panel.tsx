"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { notify } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import {
  setPlatformStoreEnabled,
  type PlatformStoreRow,
} from "@/lib/actions/platform-admin";
import {
  reviewSubscriptionPayment,
  type BillingPaymentRow,
} from "@/lib/actions/billing";
import { CustomerInvoicePreview } from "@/components/billing/customer-invoice-preview";
import { PlatformPartnersPanel } from "@/components/platform/platform-partners-panel";
import type { PartnerRow } from "@/lib/actions/partners";
import { SUBSCRIPTION } from "@/lib/billing/subscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function phaseBadge(phase: string, adminDisabled: boolean) {
  if (adminDisabled) return <Badge variant="destructive">Disabled</Badge>;
  if (phase === "trial") return <Badge variant="secondary">Trial</Badge>;
  if (phase === "active") return <Badge className="bg-emerald-600">Active</Badge>;
  if (phase === "grace") return <Badge className="bg-amber-500">Grace</Badge>;
  return <Badge variant="destructive">Locked</Badge>;
}

function storeStatusLine(store: PlatformStoreRow): string {
  if (store.adminDisabled) return "Force-disabled by platform admin";
  if (store.phase === "trial" && store.daysLeftInTrial != null) {
    return `Trial · ${store.daysLeftInTrial} day${store.daysLeftInTrial === 1 ? "" : "s"} left`;
  }
  if (store.phase === "active" && store.subscriptionEndsAt) {
    return `Paid through ${new Date(store.subscriptionEndsAt).toLocaleDateString("en-PK")}`;
  }
  if (store.phase === "grace" && store.hoursLeftInGrace != null) {
    return `Grace · ~${store.hoursLeftInGrace}h left`;
  }
  if (store.phase === "locked") return "Locked — waiting for payment / enable";
  return store.phase;
}

export function PlatformAdminPanel({
  stores,
  payments,
  partners,
  summary,
  adminEmail,
}: {
  stores: PlatformStoreRow[];
  payments: BillingPaymentRow[];
  partners: PartnerRow[];
  summary: {
    storeCount: number;
    disabledCount: number;
    pendingInvoices: number;
    pendingPartners: number;
    monthlyFee: number;
  };
  adminEmail: string;
}) {
  const router = useRouter();
  const [busyStore, setBusyStore] = useState<string | null>(null);
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

  async function toggleStore(store: PlatformStoreRow, enabled: boolean) {
    setBusyStore(store.id);
    const result = await setPlatformStoreEnabled({
      organizationId: store.id,
      enabled,
    });
    setBusyStore(null);
    if (result.error) {
      notify.error(result.error);
      return;
    }
    notify.success(enabled ? `${store.name} enabled (+30 days)` : `${store.name} disabled`);
    router.refresh();
  }

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
            {adminEmail} · fee {SUBSCRIPTION.currencyLabel}{" "}
            {summary.monthlyFee.toLocaleString("en-PK")}/mo · JazzCash{" "}
            {SUBSCRIPTION.jazzcashDisplay}
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Stores" value={String(summary.storeCount)} />
        <Stat label="Disabled / locked" value={String(summary.disabledCount)} />
        <Stat label="Pending invoices" value={String(summary.pendingInvoices)} />
        <Stat label="Pending partners" value={String(summary.pendingPartners)} />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Stores</h2>
        <p className="text-sm text-muted-foreground">
          Enable unlocks for 30 days. Disable locks the salon until you enable again or approve
          an invoice.
        </p>
        <ul className="divide-y rounded-lg border">
          {stores.length === 0 ? (
            <li className="p-4 text-sm text-muted-foreground">No stores yet.</li>
          ) : (
            stores.map((store) => {
              const isOff = store.adminDisabled || store.phase === "locked";
              return (
                <li
                  key={store.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{store.name}</p>
                      {phaseBadge(store.phase, store.adminDisabled)}
                      {store.pendingPayments > 0 && (
                        <Badge variant="outline">
                          {store.pendingPayments} invoice pending
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      /{store.slug}
                      {store.city ? ` · ${store.city}` : ""}
                      {" · "}
                      {storeStatusLine(store)}
                    </p>
                    {store.lastPayment ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Last payment: Ref {store.lastPayment.transaction_ref} ·{" "}
                        {SUBSCRIPTION.currencyLabel}{" "}
                        {store.lastPayment.amount.toLocaleString("en-PK")} ·{" "}
                        <span className="capitalize">{store.lastPayment.status}</span>
                        {store.lastPayment.has_invoice ? " · invoice attached" : ""}
                        {" · "}
                        {new Date(store.lastPayment.created_at).toLocaleDateString("en-PK")}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">
                        No JazzCash invoice submitted yet
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {isOff ? (
                      <Button
                        size="sm"
                        disabled={busyStore === store.id}
                        onClick={() => toggleStore(store, true)}
                      >
                        Enable
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busyStore === store.id}
                        onClick={() => toggleStore(store, false)}
                      >
                        Disable
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link href={`/book/${store.slug}`} target="_blank" />}
                    >
                      Booking
                    </Button>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Customer invoices</h2>
            <p className="text-sm text-muted-foreground">
              Full JazzCash proof from store owners (transaction ID + uploaded screenshot/PDF).
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
                <li>JazzCash transaction / reference ID</li>
                <li>Amount ({SUBSCRIPTION.currencyLabel} {summary.monthlyFee.toLocaleString("en-PK")})</li>
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
                  <Detail label="JazzCash transaction ID" value={p.transaction_ref} mono />
                  <Detail
                    label="Amount paid"
                    value={`${SUBSCRIPTION.currencyLabel} ${Number(p.amount).toLocaleString("en-PK")}`}
                  />
                  <Detail
                    label="Sent to JazzCash"
                    value={p.jazzcash_number || SUBSCRIPTION.jazzcashDisplay}
                    mono
                  />
                  <Detail label="Payer name" value={p.payer_name || "—"} />
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

      <PlatformPartnersPanel partners={partners} />
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={cn("mt-1 font-medium", mono && "font-mono text-sm")}>{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border px-4 py-3">
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
