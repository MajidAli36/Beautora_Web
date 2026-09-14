"use client";

import { useTransition } from "react";
import { updateSellerOrderStatus } from "@/lib/marketplace/actions";
import type { MarketplaceOrderStatus } from "@/lib/marketplace/constants";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/toast";

const NEXT: Partial<Record<MarketplaceOrderStatus, MarketplaceOrderStatus>> = {
  placed: "confirmed",
  confirmed: "shipped",
  shipped: "delivered",
};

export function SellerOrderActions({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const next = NEXT[status as MarketplaceOrderStatus];

  function run(to: MarketplaceOrderStatus) {
    startTransition(async () => {
      const res = await updateSellerOrderStatus(orderId, to);
      if (res.error) notify.error(res.error);
      else notify.success(`Order ${to}`);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {next ? (
        <Button size="sm" disabled={pending} onClick={() => run(next)}>
          Mark {next}
        </Button>
      ) : null}
      {status !== "cancelled" && status !== "delivered" ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run("cancelled")}
        >
          Cancel
        </Button>
      ) : null}
    </div>
  );
}
