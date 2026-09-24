"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { notify } from "@/lib/toast";
import {
  reviewPartnerApplication,
  type PartnerRow,
} from "@/lib/actions/partners";
import { SUBSCRIPTION } from "@/lib/billing/subscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaginatedList } from "@/components/ui/table-pagination";

export function PlatformPartnersPanel({
  partners,
  previewLimit,
  enableSearch = false,
  viewAllHref,
}: {
  partners: PartnerRow[];
  /** When set, only this many rows are shown (dashboard preview). */
  previewLimit?: number;
  enableSearch?: boolean;
  viewAllHref?: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<"pending" | "all">(
    partners.some((p) => p.status === "pending") ? "pending" : "all"
  );
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      filter === "pending" ? partners.filter((p) => p.status === "pending") : partners,
    [partners, filter]
  );

  const visible =
    previewLimit != null ? filtered.slice(0, previewLimit) : filtered;
  const pendingCount = partners.filter((p) => p.status === "pending").length;
  const isPreview = previewLimit != null && filtered.length > previewLimit;

  async function review(partnerId: string, decision: "approved" | "rejected") {
    setBusy(partnerId);
    const result = await reviewPartnerApplication({ partnerId, decision });
    setBusy(null);
    if (result.error) {
      notify.error(result.error);
      return;
    }
    notify.success(
      decision === "approved"
        ? "Partner approved — referral link is live"
        : "Partner application rejected"
    );
    router.refresh();
  }

  function PartnerRowItem({ p }: { p: PartnerRow }) {
    return (
      <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">
              {p.full_name || p.username}{" "}
              <span className="text-muted-foreground">@{p.username}</span>
            </p>
            {p.status === "pending" && <Badge variant="warning">Pending</Badge>}
            {p.status === "approved" && <Badge variant="success">Approved</Badge>}
            {p.status === "rejected" && <Badge variant="destructive">Rejected</Badge>}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {p.email}
            {p.phone ? ` · ${p.phone}` : ""} · applied{" "}
            {new Date(p.created_at).toLocaleDateString("en-PK")} ·{" "}
            {p.referredStoreCount} store
            {p.referredStoreCount === 1 ? "" : "s"} · earned{" "}
            {SUBSCRIPTION.currencyLabel} {p.earnedTotalPkr.toLocaleString("en-PK")}
          </p>
          {p.review_notes && p.status !== "pending" ? (
            <p className="mt-1 text-xs text-muted-foreground">{p.review_notes}</p>
          ) : null}
          {p.status === "approved" ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Approved — referral link is live
            </p>
          ) : null}
        </div>
        {p.status === "pending" ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={busy === p.id}
              onClick={() => review(p.id, "approved")}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={busy === p.id}
              onClick={() => review(p.id, "rejected")}
            >
              Reject
            </Button>
          </div>
        ) : null}
      </li>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Partners</h2>
          <p className="text-sm text-muted-foreground">
            Approve carefully. Approved partners earn the full first subscription ($
            {SUBSCRIPTION.asiaAmountUsd} Asia · ${SUBSCRIPTION.usdtAmountUsd} elsewhere) for each
            referred store (credited when you approve that store&apos;s first USDT invoice —
            manual today).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={filter === "pending" ? "default" : "outline"}
            onClick={() => setFilter("pending")}
          >
            Pending ({pendingCount})
          </Button>
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            All ({partners.length})
          </Button>
          {viewAllHref ? (
            <Link
              href={viewAllHref}
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              View all partners ({partners.length})
            </Link>
          ) : null}
        </div>
      </div>

      {enableSearch ? (
        <PaginatedList
          items={filtered}
          pageSize={10}
          empty={
            <li className="list-none p-4 text-sm text-muted-foreground">
              {filter === "pending" ? "No pending partner applications." : "No partners yet."}
            </li>
          }
          search={{
            placeholder: "Search name, @username, email, phone, status…",
            getText: (p) =>
              [
                p.full_name,
                p.username,
                p.email,
                p.phone ?? "",
                p.status,
                String(p.referredStoreCount),
              ].join(" "),
          }}
        >
          {(slice) => (
            <ul className="divide-y rounded-lg border">
              {slice.map((p) => (
                <PartnerRowItem key={p.id} p={p} />
              ))}
            </ul>
          )}
        </PaginatedList>
      ) : (
        <>
          <ul className="divide-y rounded-lg border">
            {visible.length === 0 ? (
              <li className="p-4 text-sm text-muted-foreground">
                {filter === "pending"
                  ? "No pending partner applications."
                  : "No partners yet."}
              </li>
            ) : (
              visible.map((p) => <PartnerRowItem key={p.id} p={p} />)
            )}
          </ul>
          {isPreview && viewAllHref ? (
            <p className="text-xs text-muted-foreground">
              Showing {visible.length} of {filtered.length}.{" "}
              <Link
                href={viewAllHref}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Search and manage all partners →
              </Link>
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
