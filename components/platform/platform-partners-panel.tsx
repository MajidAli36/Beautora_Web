"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import {
  reviewPartnerApplication,
  type PartnerRow,
} from "@/lib/actions/partners";
import { SUBSCRIPTION } from "@/lib/billing/subscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function PlatformPartnersPanel({ partners }: { partners: PartnerRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"pending" | "all">(
    partners.some((p) => p.status === "pending") ? "pending" : "all"
  );
  const [busy, setBusy] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      filter === "pending" ? partners.filter((p) => p.status === "pending") : partners,
    [partners, filter]
  );

  const pendingCount = partners.filter((p) => p.status === "pending").length;

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

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Partners</h2>
          <p className="text-sm text-muted-foreground">
            Approve carefully. Approved partners earn the full first{" "}
            {SUBSCRIPTION.currencyLabel} {SUBSCRIPTION.monthlyAmountPkr.toLocaleString("en-PK")}{" "}
            subscription for each referred store (credited when you approve that store&apos;s
            first JazzCash invoice — manual today).
          </p>
        </div>
        <div className="flex gap-2">
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
            All
          </Button>
        </div>
      </div>

      <ul className="divide-y rounded-lg border">
        {visible.length === 0 ? (
          <li className="p-4 text-sm text-muted-foreground">
            {filter === "pending" ? "No pending partner applications." : "No partners yet."}
          </li>
        ) : (
          visible.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
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
          ))
        )}
      </ul>
    </section>
  );
}
