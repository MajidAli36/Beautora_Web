"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { notify } from "@/lib/toast";
import {
  getPlatformStoreDetails,
  setPlatformStoreEnabled,
  setPlatformStoreLifetimeAccess,
  type PlatformStoreDetails,
  type PlatformStoreRow,
} from "@/lib/actions/platform-admin";
import { CustomerInvoicePreview } from "@/components/billing/customer-invoice-preview";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaginatedList } from "@/components/ui/table-pagination";
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
  const base =
    "h-auto min-h-6 overflow-visible px-2.5 py-1 text-xs font-semibold tracking-wide";
  if (adminDisabled) {
    return (
      <Badge variant="destructive" className={cn(base, "bg-destructive text-white")}>
        Disabled
      </Badge>
    );
  }
  if (lifetimeAccess || phase === "lifetime") {
    return (
      <Badge
        className={cn(
          base,
          "border-violet-800 bg-violet-700 text-white shadow-sm dark:bg-violet-600"
        )}
      >
        Lifetime
      </Badge>
    );
  }
  if (phase === "trial") {
    return (
      <Badge variant="secondary" className={base}>
        Trial
      </Badge>
    );
  }
  if (phase === "active") {
    return <Badge className={cn(base, "bg-emerald-600 text-white")}>Active</Badge>;
  }
  if (phase === "grace") {
    return <Badge className={cn(base, "bg-amber-500 text-white")}>Grace</Badge>;
  }
  return (
    <Badge variant="destructive" className={cn(base, "bg-destructive text-white")}>
      Locked
    </Badge>
  );
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

export function PlatformStoresPanel({
  stores,
  storesTotal,
  previewLimit,
  enableSearch = false,
  viewAllHref,
}: {
  stores: PlatformStoreRow[];
  /** Full count when `stores` is a dashboard preview slice. */
  storesTotal?: number;
  previewLimit?: number;
  enableSearch?: boolean;
  viewAllHref?: string;
}) {
  const router = useRouter();
  const [busyStore, setBusyStore] = useState<string | null>(null);
  const storeTotal = storesTotal ?? stores.length;
  const list =
    previewLimit != null && !enableSearch ? stores.slice(0, previewLimit) : stores;
  const storesPreview = !enableSearch && storeTotal > list.length;

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

  function renderItem(store: PlatformStoreRow) {
    return (
      <StoreListItem
        key={store.id}
        store={store}
        busy={busyStore === store.id}
        onToggleEnabled={(enabled) => void toggleStore(store, enabled)}
        onToggleLifetime={(enabled) => void toggleLifetime(store, enabled)}
      />
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Stores</h2>
          <p className="text-sm text-muted-foreground">
            <strong>Lifetime</strong> = no monthly fee (store paid once / complimentary). Toggle
            off anytime to return to normal billing. <strong>Enable</strong> unlocks +30 days.{" "}
            <strong>Disable</strong> force-locks the salon. Open <strong>Details</strong> on any
            store for full profile, owner, subscription, usage counts, and payment history.
          </p>
        </div>
        {viewAllHref ? (
          <Link
            href={viewAllHref}
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            View all stores ({storeTotal})
          </Link>
        ) : null}
      </div>

      {enableSearch ? (
        <PaginatedList
          items={stores}
          pageSize={10}
          empty={
            <li className="list-none p-4 text-sm text-muted-foreground">No stores yet.</li>
          }
          search={{
            placeholder: "Search name, slug, city, phone, email, status…",
            getText: (s) =>
              [
                s.name,
                s.slug,
                s.city ?? "",
                s.country ?? "",
                s.phone ?? "",
                s.email ?? "",
                s.phase,
                s.adminDisabled ? "disabled" : "",
                s.lifetimeAccess ? "lifetime" : "",
                storeStatusLine(s),
              ].join(" "),
          }}
        >
          {(slice) => (
            <ul className="divide-y rounded-lg border">{slice.map(renderItem)}</ul>
          )}
        </PaginatedList>
      ) : (
        <>
          <ul className="divide-y rounded-lg border">
            {list.length === 0 ? (
              <li className="p-4 text-sm text-muted-foreground">No stores yet.</li>
            ) : (
              list.map(renderItem)
            )}
          </ul>
          {storesPreview && viewAllHref ? (
            <p className="text-xs text-muted-foreground">
              Showing latest {list.length} of {storeTotal} stores.{" "}
              <Link
                href={viewAllHref}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Search and manage all stores →
              </Link>
            </p>
          ) : null}
        </>
      )}
    </section>
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
    startTransition(async () => {
      setError(null);
      setDetails(null);
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
              <Badge variant="outline">{store.pendingPayments} invoice pending</Badge>
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
          <Detail
            label="Address"
            value={dash(details.displayAddress)}
            note={
              details.displayAddressNote ??
              (!details.displayAddress ? "Not set in store Settings yet" : null)
            }
          />
          <Detail
            label="Phone"
            value={dash(details.displayPhone)}
            note={
              details.displayPhoneNote ??
              (!details.displayPhone ? "Not set in store Settings yet" : null)
            }
          />
          <Detail
            label="WhatsApp"
            value={dash(details.displayWhatsapp)}
            note={
              details.displayWhatsappNote ??
              (!details.displayWhatsapp ? "Not set in store Settings yet" : null)
            }
          />
          <Detail
            label="Email"
            value={dash(details.displayEmail)}
            note={
              details.displayEmailNote ??
              (!details.displayEmail ? "Not set in store Settings yet" : null)
            }
          />
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
          <Detail label="Owner phone" value={dash(details.ownerPhone)} />
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
          <Detail label="Referral code" value={dash(details.referralCodeUsed)} mono />
          <Detail label="Partner ID" value={dash(details.referredByPartnerId)} mono />
        </dl>
      </div>

      <div>
        <h3 className="text-sm font-semibold">Usage</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MiniStat label="Members" value={String(details.memberCount)} />
          <MiniStat label="Staff" value={String(details.staffCount)} />
          <MiniStat label="Customers" value={String(details.customerCount)} />
          <MiniStat label="Sales" value={String(details.saleCount)} />
          <MiniStat label="Appointments" value={String(details.appointmentCount)} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold">
          Store payment accounts ({details.paymentAccounts.length})
        </h3>
        {details.paymentAccounts.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No JazzCash / bank accounts saved in store settings yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {details.paymentAccounts.map((a) => (
              <li
                key={a.id}
                className="rounded-md border bg-background px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{a.label}</span>
                  <Badge variant="outline" className="capitalize">
                    {a.accountType.replaceAll("_", " ")}
                  </Badge>
                  {!a.isActive ? <Badge variant="secondary">Inactive</Badge> : null}
                </div>
                <p className="mt-1 font-mono text-xs">
                  {a.accountNumber}
                  {a.accountTitle ? ` · ${a.accountTitle}` : ""}
                  {a.bankName ? ` · ${a.bankName}` : ""}
                </p>
                {a.extraNote ? (
                  <p className="mt-1 text-xs text-muted-foreground">{a.extraNote}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
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
        <Button
          size="sm"
          variant="outline"
          render={<Link href={`/book/${details.slug}`} target="_blank" />}
        >
          Open booking page
        </Button>
        <Button
          size="sm"
          variant="outline"
          render={<Link href={`/stores/${details.slug}`} target="_blank" />}
        >
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
