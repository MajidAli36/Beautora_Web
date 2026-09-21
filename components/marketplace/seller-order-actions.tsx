"use client";

import { useTransition } from "react";
import { updateSellerSubOrderStatus } from "@/lib/marketplace/fulfillment";
import {
  markMarketplaceOrderPaid,
  updateSellerOrderStatus,
} from "@/lib/marketplace/actions";
import type {
  MarketplaceOrderStatus,
  SellerOrderStatus,
} from "@/lib/marketplace/constants";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/toast";

const NEXT_SUB: Partial<Record<SellerOrderStatus, SellerOrderStatus>> = {
  placed: "confirmed",
  confirmed: "processing",
  processing: "ready",
  ready: "shipped",
  shipped: "delivered",
};

const NEXT_PARENT: Partial<Record<MarketplaceOrderStatus, MarketplaceOrderStatus>> = {
  placed: "confirmed",
  confirmed: "shipped",
  shipped: "delivered",
};

export function SellerOrderActions({
  orderId,
  status,
  sellerOrderId,
  paymentMethod,
  paymentStatus,
}: {
  orderId: string;
  status: string;
  sellerOrderId?: string | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
}) {
  const [pending, startTransition] = useTransition();

  const showMarkPaid =
    (paymentMethod === "CARD" || paymentMethod === "card") &&
    paymentStatus !== "paid";

  if (sellerOrderId) {
    const next = NEXT_SUB[status as SellerOrderStatus];
    function run(to: SellerOrderStatus) {
      startTransition(async () => {
        const res = await updateSellerSubOrderStatus(sellerOrderId!, to);
        if (res.error) notify.error(res.error);
        else notify.success(`Fulfillment ${to}`);
      });
    }
    return (
      <div className="flex flex-wrap gap-2">
        {showMarkPaid ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const res = await markMarketplaceOrderPaid(orderId);
                if (res.error) notify.error(res.error);
                else notify.success(res.message ?? "Payment confirmed — invoice sent");
              });
            }}
          >
            Confirm card payment
          </Button>
        ) : null}
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

  const next = NEXT_PARENT[status as MarketplaceOrderStatus];
  function runParent(to: MarketplaceOrderStatus) {
    startTransition(async () => {
      const res = await updateSellerOrderStatus(orderId, to);
      if (res.error) notify.error(res.error);
      else notify.success(`Order ${to}`);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {showMarkPaid ? (
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const res = await markMarketplaceOrderPaid(orderId);
              if (res.error) notify.error(res.error);
              else notify.success(res.message ?? "Payment confirmed — invoice sent");
            });
          }}
        >
          Confirm card payment
        </Button>
      ) : null}
      {next ? (
        <Button size="sm" disabled={pending} onClick={() => runParent(next)}>
          Mark {next}
        </Button>
      ) : null}
      {status !== "cancelled" && status !== "delivered" ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => runParent("cancelled")}
        >
          Cancel
        </Button>
      ) : null}
    </div>
  );
}
