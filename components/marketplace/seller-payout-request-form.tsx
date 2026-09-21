"use client";

import { useTransition } from "react";
import { requestSellerPayout } from "@/lib/marketplace/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { notify } from "@/lib/toast";
import { formatCurrency } from "@/lib/format";
import type { Database } from "@/types/database.types";

type RequestRow = Database["public"]["Tables"]["marketplace_payout_requests"]["Row"];

export function SellerPayoutRequestForm({
  available,
  requests,
}: {
  available: number;
  requests: RequestRow[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <form
        className="space-y-4 rounded-lg border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const res = await requestSellerPayout(fd);
            if (res.error) notify.error(res.error);
            else {
              notify.success(res.message ?? "Request submitted");
              e.currentTarget.reset();
            }
          });
        }}
      >
        <p className="text-sm text-muted-foreground">
          Available balance {formatCurrency(available)}. Requests are reviewed by platform admin.
        </p>
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="1"
            max={available > 0 ? available : undefined}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="method">Method</Label>
          <select
            id="method"
            name="method"
            defaultValue="manual"
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="manual">Manual / bank transfer</option>
            <option value="bank">Bank</option>
            <option value="wallet">Wallet</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="payout_details">Payout details</Label>
          <Textarea
            id="payout_details"
            name="payout_details"
            rows={2}
            placeholder="Account title / IBAN / notes"
          />
        </div>
        <Button type="submit" disabled={pending || available <= 0}>
          {pending ? "Submitting…" : "Request payout"}
        </Button>
      </form>

      <div className="space-y-2">
        <p className="text-sm font-medium">Your requests</p>
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payout requests yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 px-3 py-2">
                <span>
                  {formatCurrency(Number(r.amount))} · {r.method}
                </span>
                <span className="text-muted-foreground">{r.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
