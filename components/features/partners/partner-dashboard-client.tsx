"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, LogOut, Users, Wallet, Clock, CheckCircle2 } from "lucide-react";
import { notify } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import { SUBSCRIPTION } from "@/lib/billing/subscription";
import {
  partnerReferralPartnerPath,
  partnerReferralSignupPath,
  partnerReferralSitePath,
} from "@/lib/partners/referral";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaginatedList } from "@/components/ui/table-pagination";
import type {
  PartnerCommissionRow,
  PartnerReferredStore,
  PartnerStatus,
} from "@/lib/actions/partners";

type PartnerDashboardClientProps = {
  partner: {
    username: string;
    email: string;
    full_name: string | null;
    status: PartnerStatus;
    review_notes: string | null;
  };
  stores: PartnerReferredStore[];
  commissions: PartnerCommissionRow[];
  totals: {
    referredStores: number;
    earnedPkr: number;
    awaitingPayoutPkr: number;
    paidOutPkr: number;
    pendingFirstPayments: number;
  };
  origin: string;
};

function statusBadge(status: PartnerStatus) {
  if (status === "approved") return <Badge variant="success">Approved</Badge>;
  if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="warning">Pending approval</Badge>;
}

function phaseLabel(store: PartnerReferredStore) {
  switch (store.referral_phase) {
    case "paid_out":
      return {
        badge: <Badge variant="success">Paid to you</Badge>,
        detail: `${formatMoney(Number(store.commission_amount_pkr))} transferred`,
      };
    case "earned":
      return {
        badge: (
          <Badge variant="default">
            You earned {formatMoney(Number(store.commission_amount_pkr))}
          </Badge>
        ),
        detail: "First subscription approved — awaiting SyncOps payout (manual for now)",
      };
    case "awaiting_first_payment":
      return {
        badge: <Badge variant="warning">Awaiting first payment</Badge>,
        detail: "Store opened — earn when SyncOps approves their first invoice",
      };
    default:
      return {
        badge: <Badge variant="secondary">On trial</Badge>,
        detail: "Free trial — commission unlocks on first paid month",
      };
  }
}

function formatMoney(amount: number) {
  return `$${amount.toLocaleString("en-US")}`;
}

export function PartnerDashboardClient({
  partner,
  stores,
  commissions,
  totals,
  origin,
}: PartnerDashboardClientProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const links = useMemo(() => {
    const u = partner.username;
    return {
      signup: `${origin}${partnerReferralSignupPath(u)}`,
      site: `${origin}${partnerReferralSitePath(u)}`,
      partner: `${origin}${partnerReferralPartnerPath(u)}`,
    };
  }, [origin, partner.username]);

  async function copyText(label: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      notify.success(`${label} copied`);
    } catch {
      notify.error("Could not copy — select the link manually");
    }
  }

  async function signOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/partner");
    router.refresh();
  }

  return (
    <div>
      <header className="sticky top-0 z-20 border-b border-[#EAEAEA] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0F9D8C]">
              Beautora · Partner only
            </p>
            <p className="truncate text-sm font-semibold text-[#111827]">
              {partner.full_name || partner.username}
              <span className="ml-2 font-normal text-[#6B7280]">@{partner.username}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {statusBadge(partner.status)}
            <Button
              variant="outline"
              size="sm"
              disabled={signingOut}
              onClick={signOut}
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">
                {signingOut ? "Signing out…" : "Sign out"}
              </span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        {partner.status === "pending" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Your application is under review by SyncOps. Explore this dashboard now — your
            referral link activates after approval.
          </div>
        )}

        {partner.status === "rejected" && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            Your partner application was not approved.
            {partner.review_notes ? (
              <span className="mt-1 block">{partner.review_notes}</span>
            ) : null}
          </div>
        )}

        {/* Earnings hero */}
        <section className="rounded-xl border border-[#EAEAEA] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                Total earned from first subscriptions
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl">
                {formatMoney(totals.earnedPkr)}
              </p>
              <p className="mt-2 max-w-xl text-sm text-[#6B7280]">
                When a salon you refer pays their first month ($
                {SUBSCRIPTION.asiaAmountUsd}–${SUBSCRIPTION.usdtAmountUsd} by region), that full
                amount is credited here after SyncOps manually approves their USDT invoice.
                Renewals are not shared.
              </p>
            </div>
            <div className="grid w-full gap-2 sm:w-auto sm:min-w-[220px]">
              <MiniStat
                icon={<Wallet className="size-4 text-[#0F9D8C]" />}
                label="Awaiting payout"
                value={formatMoney(totals.awaitingPayoutPkr)}
              />
              <MiniStat
                icon={<CheckCircle2 className="size-4 text-[#16A34A]" />}
                label="Already paid out"
                value={formatMoney(totals.paidOutPkr)}
              />
            </div>
          </div>
          <p className="mt-4 rounded-lg bg-[#FAFAFA] px-3 py-2 text-xs text-[#6B7280]">
            Payments are manual today (USDT + SyncOps review). Automated payouts can be
            added later without changing how referrals are tracked.
          </p>
        </section>

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            icon={<Users className="size-4" />}
            label="Referred users / stores"
            value={String(totals.referredStores)}
          />
          <Stat
            icon={<Clock className="size-4" />}
            label="Waiting for 1st payment"
            value={String(totals.pendingFirstPayments)}
          />
          <Stat
            icon={<Wallet className="size-4" />}
            label="First payments earned"
            value={String(commissions.filter((c) => c.status !== "void").length)}
          />
        </div>

        {/* Referral link */}
        <section className="space-y-3 rounded-xl border border-[#EAEAEA] bg-white p-5">
          <h2 className="text-lg font-semibold text-[#111827]">
            Your personal referral links
          </h2>
          <p className="text-sm text-[#6B7280]">
            Only <span className="font-semibold text-[#111827]">@{partner.username}</span>{" "}
            earns from these links. Each partner has a separate code — sharing someone
            else&apos;s link credits them, not you. All three URLs below use your same code;
            visitors are remembered for 90 days even if they browse first and sign up later.
          </p>
          <div className="space-y-3">
            <ReferralLinkRow
              label="Signup (best to share)"
              url={partner.status === "approved" ? links.signup : null}
              disabled={partner.status !== "approved"}
              onCopy={() => void copyText("Signup link", links.signup)}
            />
            <ReferralLinkRow
              label="Website home (same partner)"
              url={partner.status === "approved" ? links.site : null}
              disabled={partner.status !== "approved"}
              onCopy={() => void copyText("Website link", links.site)}
            />
            <ReferralLinkRow
              label="Partner page (same partner)"
              url={partner.status === "approved" ? links.partner : null}
              disabled={partner.status !== "approved"}
              onCopy={() => void copyText("Partner page link", links.partner)}
            />
          </div>
        </section>

        {/* Referred users */}
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">Your referred users</h2>
            <p className="text-sm text-[#6B7280]">
              Every store opened with your link. Rupees appear only after their first subscription
              is approved.
            </p>
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-[#EAEAEA] bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#EAEAEA] bg-[#FAFAFA] text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">
                <tr>
                  <th className="px-4 py-3">Store</th>
                  <th className="px-4 py-3">Referral user</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Your rupees</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEAEA]">
                {stores.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[#6B7280]">
                      No referred users yet. Share your link after you&apos;re approved.
                    </td>
                  </tr>
                ) : (
                  stores.map((store) => {
                    const phase = phaseLabel(store);
                    return (
                      <tr key={store.id} className="hover:bg-[#FAFAFA]/">
                        <td className="px-4 py-3">
                          <p className="font-medium text-[#111827]">{store.name}</p>
                          <p className="text-xs text-[#6B7280]">
                            /{store.slug}
                            {store.city ? ` · ${store.city}` : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[#111827]">
                            {store.owner_name || store.owner_email || "—"}
                          </p>
                          {store.owner_email && store.owner_name ? (
                            <p className="text-xs text-[#6B7280]">{store.owner_email}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-[#6B7280]">
                          {new Date(store.created_at).toLocaleDateString("en-PK")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {phase.badge}
                            <p className="text-[11px] text-[#9CA3AF]">{phase.detail}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {store.commission_amount_pkr != null ? (
                            <span className="font-semibold text-[#0F9D8C]">
                              {formatMoney(store.commission_amount_pkr)}
                            </span>
                          ) : (
                            <span className="text-[#9CA3AF]">$0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {stores.length === 0 ? (
              <li className="rounded-xl border border-[#EAEAEA] bg-white p-4 text-sm text-[#6B7280]">
                No referred users yet. Share your link after you&apos;re approved.
              </li>
            ) : (
              stores.map((store) => {
                const phase = phaseLabel(store);
                return (
                  <li
                    key={store.id}
                    className="rounded-xl border border-[#EAEAEA] bg-white p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#111827]">{store.name}</p>
                        <p className="text-xs text-[#6B7280]">
                          {store.owner_email || store.owner_name || "Owner pending"}
                        </p>
                      </div>
                      <p className="font-semibold text-[#0F9D8C]">
                        {store.commission_amount_pkr != null
                          ? formatMoney(store.commission_amount_pkr)
                          : "$0"}
                      </p>
                    </div>
                    {phase.badge}
                    <p className="text-xs text-[#6B7280]">{phase.detail}</p>
                  </li>
                );
              })
            )}
          </ul>
        </section>

        {/* Earnings ledger */}
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">USD earned</h2>
            <p className="text-sm text-[#6B7280]">
              One row per first paid subscription credited on your behalf.
            </p>
          </div>
          <PaginatedList
            items={commissions}
            empty={
              <p className="rounded-xl border border-[#EAEAEA] bg-white p-4 text-sm text-[#6B7280]">
                No earnings yet. When SyncOps approves a referred store&apos;s first USDT
                payment, ${SUBSCRIPTION.asiaAmountUsd}–${SUBSCRIPTION.usdtAmountUsd} appears
                here.
              </p>
            }
            search={{
              placeholder: "Search organization, status…",
              getText: (c) =>
                [c.organization_name, c.status, String(c.amount_pkr)].join(" "),
              emptyFiltered: (
                <p className="text-sm text-[#6B7280]">No earnings match your search.</p>
              ),
            }}
          >
            {(slice) => (
              <ul className="divide-y divide-[#EAEAEA] rounded-xl border border-[#EAEAEA] bg-white">
                {slice.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-[#111827]">{c.organization_name}</p>
                      <p className="text-xs text-[#6B7280]">
                        First subscription · {new Date(c.created_at).toLocaleString("en-PK")} ·{" "}
                        {c.status === "paid"
                          ? "Paid out to you"
                          : c.status === "earned"
                            ? "Earned — awaiting payout"
                            : c.status}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-[#0F9D8C]">
                      +{formatMoney(c.amount_pkr)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </PaginatedList>
        </section>

        <p className="pb-6 text-center text-xs text-[#9CA3AF]">
          Partner portal only — no salon POS access.{" "}
          <Link href="/" className="underline-offset-2 hover:underline">
            Marketing site
          </Link>
        </p>
      </main>
    </div>
  );
}

function ReferralLinkRow({
  label,
  url,
  disabled,
  onCopy,
}: {
  label: string;
  url: string | null;
  disabled: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">{label}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 truncate rounded-lg border border-[#EAEAEA] bg-[#FAFAFA] px-3 py-2.5 text-xs text-[#111827] sm:text-sm">
          {url ?? "Available after SyncOps approval"}
        </code>
        <Button type="button" size="sm" disabled={disabled || !url} onClick={onCopy}>
          <Copy className="size-4" />
          Copy
        </Button>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-3">
      <div className="flex items-center gap-2 text-[#6B7280]">
        {icon}
        <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-1 text-xl font-bold tracking-tight text-[#111827]">{value}</p>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#EAEAEA] bg-[#FAFAFA] px-3 py-2">
      {icon}
      <div>
        <p className="text-[11px] text-[#6B7280]">{label}</p>
        <p className="text-sm font-semibold text-[#111827]">{value}</p>
      </div>
    </div>
  );
}
