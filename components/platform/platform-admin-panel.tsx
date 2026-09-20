"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { notify } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import {
  getPlatformStoreDetails,
  setPlatformStoreEnabled,
  setPlatformStoreLifetimeAccess,
  type PlatformStoreDetails,
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

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-PK");
}

function dash(value: string | null | undefined) {
  const t = value?.trim();
  return t ? t : "—";
}

function phaseBadge(phase: string, adminDisabled: boolean, lifetimeAccess: boolean) {
  if (adminDisabled) return <Badge variant="destructive">Disabled</Badge>;
  if (lifetimeAccess || phase === "lifetime") {
    return <Badge className="bg-violet-700">Lifetime</Badge>;
  }
  if (phase === "trial") return <Badge variant="secondary">Trial</Badge>;
  if (phase === "active") return <Badge className="bg-emerald-600">Active</Badge>;
  if (phase === "grace") return <Badge className="bg-amber-500">Grace</Badge>;
  return <Badge variant="destructive">Locked</Badge>;
}

function storeStatusLine(store: PlatformStoreRow): string {
  if (store.adminDisabled) return "Force-disabled by platform admin";
  if (store.lifetimeAccess || store.phase === "lifetime") {
    return "Lifetime access — no monthly subscription";
  }
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
    lifetimeCount: number;
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

  async function toggleLifetime(store: PlatformStoreRow, enabled: boolean) {
    setBusyStore(store.id);
    const result = await setPlatformStoreLifetimeAccess({
      organizationId: store.id,
      enabled,
    });
    setBusyStore(null);
    if (result.error) {
      notify.error(result.error);
      return;
    }
    notify.success(
      enabled
        ? `${store.name} — lifetime access ON (no monthly fee)`
        : `${store.name} — lifetime access OFF`
    );
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

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Stores</h2>
        <p className="text-sm text-muted-foreground">
          <strong>Lifetime</strong> = no monthly fee (store paid once / complimentary). Toggle
          off anytime to return to normal billing. <strong>Enable</strong> unlocks +30 days.{" "}
          <strong>Disable</strong> force-locks the salon. Open <strong>Details</strong> on
          any store for full profile, owner, subscription, usage counts, and payment history.
        </p>
        <ul className="divide-y rounded-lg border">
          {stores.length === 0 ? (
            <li className="p-4 text-sm text-muted-foreground">No stores yet.</li>
          ) : (
            stores.map((store) => (
              <StoreListItem
                key={store.id}
                store={store}
                busy={busyStore === store.id}
                onToggleEnabled={(enabled) => void toggleStore(store, enabled)}
                onToggleLifetime={(enabled) => void toggleLifetime(store, enabled)}
              />
            ))
          )}
        </ul>
      </section>

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

      <PlatformPartnersPanel partners={partners} />
    </div>
  );
}

function StoreListItem({
  store,
  busy,
  onToggleEnabled,
  onToggleLifetime,
}: {
  store: PlatformStoreRow;
  busy: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  onToggleLifetime: (enabled: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<PlatformStoreDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isOff = store.adminDisabled || store.phase === "locked";

  function toggleDetails() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (details) return;
    startTransition(async () => {
      setError(null);
      try {
        const data = await getPlatformStoreDetails(store.id);
        if (!data) {
          setError("Could not load salon details.");
          return;
        }
        setDetails(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load details");
      }
    });
  }

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{store.name}</p>
            {phaseBadge(store.phase, store.adminDisabled, store.lifetimeAccess)}
            {store.pendingPayments > 0 && (
              <Badge variant="outline">
                {store.pendingPayments} invoice pending
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            /{store.slug}
            {store.city ? ` · ${store.city}` : ""}
            {store.country ? ` · ${store.country}` : ""}
            {" · "}
            {storeStatusLine(store)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {[
              store.phone ? `Phone ${store.phone}` : null,
              store.email ? store.email : null,
              `Created ${formatShortDate(store.createdAt)}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {store.lastPayment ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Last payment: Ref {store.lastPayment.transaction_ref} ·{" "}
              {store.lastPayment.currency}{" "}
              {store.lastPayment.amount.toLocaleString("en-PK")} ·{" "}
              <span className="capitalize">{store.lastPayment.status}</span>
              {store.lastPayment.has_invoice ? " · invoice attached" : ""}
              {" · "}
              {formatShortDate(store.lastPayment.created_at)}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              No payment proof submitted yet
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={open ? "secondary" : "outline"}
            onClick={toggleDetails}
            disabled={pending}
          >
            {open ? (
              <ChevronDown className="mr-1 size-3.5" />
            ) : (
              <ChevronRight className="mr-1 size-3.5" />
            )}
            {pending ? "Loading…" : "Details"}
          </Button>
          {store.lifetimeAccess ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onToggleLifetime(false)}
            >
              Remove lifetime
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onToggleLifetime(true)}
            >
              Grant lifetime
            </Button>
          )}
          {isOff ? (
            <Button size="sm" disabled={busy} onClick={() => onToggleEnabled(true)}>
              Enable
            </Button>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => onToggleEnabled(false)}
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
      </div>

      {open ? (
        <div className="mt-4 rounded-md border bg-muted/30 p-4">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : pending && !details ? (
            <p className="text-sm text-muted-foreground">Loading full salon details…</p>
          ) : details ? (
            <StoreDetailsPanel details={details} />
          ) : (
            <p className="text-sm text-muted-foreground">No details available.</p>
          )}
        </div>
      ) : null}
    </li>
  );
}

function StoreDetailsPanel({ details }: { details: PlatformStoreDetails }) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold">Profile</h3>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Salon name" value={details.name} />
          <Detail label="Slug" value={`/${details.slug}`} mono />
          <Detail label="Tagline" value={dash(details.tagline)} />
          <Detail label="City" value={dash(details.city)} />
          <Detail label="Country" value={dash(details.country)} />
          <Detail label="Address" value={dash(details.address)} />
          <Detail label="Phone" value={dash(details.phone)} />
          <Detail label="WhatsApp" value={dash(details.whatsappPhone)} />
          <Detail label="Email (profile)" value={dash(details.email)} />
          <Detail
            label="Public booking"
            value={details.publicBookingEnabled ? "Enabled" : "Disabled"}
          />
          <Detail
            label="Public listing"
            value={details.publicListingEnabled ? "Enabled" : "Disabled"}
          />
          <Detail label="Created" value={formatDate(details.createdAt)} />
          <Detail label="Updated" value={formatDate(details.updatedAt)} />
          <Detail label="Organization ID" value={details.id} mono />
        </dl>
      </div>

      <div>
        <h3 className="text-sm font-semibold">Owner account</h3>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Owner name" value={dash(details.ownerName)} />
          <Detail label="Owner email" value={dash(details.ownerEmail)} />
          <Detail label="Owner user ID" value={dash(details.ownerUserId)} mono />
        </dl>
      </div>

      <div>
        <h3 className="text-sm font-semibold">Subscription</h3>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Phase" value={details.phase} />
          <Detail label="DB status" value={details.subscriptionStatus} />
          <Detail
            label="Lifetime"
            value={
              details.lifetimeAccess
                ? `Yes${details.lifetimeAccessAt ? ` · since ${formatShortDate(details.lifetimeAccessAt)}` : ""}`
                : "No"
            }
          />
          <Detail
            label="Admin disabled"
            value={
              details.adminDisabled
                ? `Yes · ${formatDate(details.adminDisabledAt)}`
                : "No"
            }
          />
          <Detail label="Trial ends" value={formatDate(details.trialEndsAt)} />
          <Detail label="Paid through" value={formatDate(details.subscriptionEndsAt)} />
          <Detail label="Locked at" value={formatDate(details.subscriptionLockedAt)} />
          <Detail
            label="Referral code"
            value={dash(details.referralCodeUsed)}
            mono
          />
          <Detail
            label="Partner ID"
            value={dash(details.referredByPartnerId)}
            mono
          />
        </dl>
      </div>

      <div>
        <h3 className="text-sm font-semibold">Usage</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Members" value={String(details.memberCount)} />
          <Stat label="Staff" value={String(details.staffCount)} />
          <Stat label="Customers" value={String(details.customerCount)} />
          <Stat label="Sales" value={String(details.saleCount)} />
          <Stat label="Appointments" value={String(details.appointmentCount)} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold">
          Subscription payments ({details.payments.length})
        </h3>
        {details.payments.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No subscription payment proofs for this salon.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {details.payments.map((p) => (
              <li
                key={p.id}
                className="rounded-md border bg-background px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      p.status === "approved"
                        ? "default"
                        : p.status === "pending"
                          ? "secondary"
                          : "destructive"
                    }
                    className="capitalize"
                  >
                    {p.status}
                  </Badge>
                  <span className="font-medium">
                    {p.currency} {p.amount.toLocaleString("en-PK")}
                  </span>
                  <span className="text-muted-foreground">
                    {p.payment_method === "usdt_bep20" ? "USDT BEP-20" : "JazzCash"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(p.created_at)}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  Ref {p.transaction_ref}
                  {p.payer_name ? ` · ${p.payer_name}` : ""}
                  {p.has_invoice ? " · invoice file" : " · no file"}
                </p>
                {p.notes ? (
                  <p className="mt-1 text-xs text-muted-foreground">{p.notes}</p>
                ) : null}
                {p.has_invoice ? (
                  <div className="mt-2">
                    <CustomerInvoicePreview paymentId={p.id} mime={p.invoice_mime} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" render={<Link href={`/book/${details.slug}`} target="_blank" />}>
          Open booking page
        </Button>
        <Button size="sm" variant="outline" render={<Link href={`/stores/${details.slug}`} target="_blank" />}>
          Public store listing
        </Button>
      </div>
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
      <dd className={cn("mt-1 break-all font-medium", mono && "font-mono text-sm")}>{value}</dd>
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
