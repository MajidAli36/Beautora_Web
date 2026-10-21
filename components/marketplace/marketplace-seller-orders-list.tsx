"use client";

import { SellerOrderActions } from "@/components/marketplace/seller-order-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaginatedList } from "@/components/ui/table-pagination";
import { formatCurrency } from "@/lib/format";

type SellerOrderRow = {
  id: string;
  order_id: string;
  status: string;
  total: number;
  marketplace_orders?: {
    id: string;
    order_number: string;
    buyer_name: string;
    buyer_phone: string;
    buyer_address: string;
    payment_method?: string;
    payment_status?: string;
    currency?: string | null;
  } | null;
  marketplace_order_items?: Array<{
    id: string;
    product_title: string;
    quantity: number;
    line_total: number;
  }>;
};

/** Paginated seller order cards (marketplace orders page). */
export function MarketplaceSellerOrdersList({
  orders,
}: {
  orders: SellerOrderRow[];
}) {
  return (
    <PaginatedList
      items={orders}
      empty={
        <p className="py-8 text-center text-sm text-muted-foreground">
          No marketplace orders yet.
        </p>
      }
      search={{
        placeholder: "Search order #, buyer, phone…",
        getText: (row) => {
          const order = row.marketplace_orders;
          const items = row.marketplace_order_items ?? [];
          return [
            order?.order_number,
            order?.buyer_name,
            order?.buyer_phone,
            order?.buyer_address,
            row.status,
            ...items.map((i) => i.product_title),
          ]
            .filter(Boolean)
            .join(" ");
        },
      }}
    >
      {(slice) => (
        <div className="space-y-4">
          {slice.map((row) => {
            const order = row.marketplace_orders;
            const items = row.marketplace_order_items ?? [];
            const moneyOpts = { currency: order?.currency ?? undefined };
            return (
              <Card key={row.id}>
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
                  <div>
                    <CardTitle className="text-base">
                      {order?.order_number ?? "Order"}
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {order?.buyer_name} · {order?.buyer_phone}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order?.buyer_address}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline">{row.status}</Badge>
                    <p className="text-xs text-muted-foreground">
                      {order?.payment_method ?? "COD"} ·{" "}
                      {order?.payment_status ?? "unpaid"}
                      {order?.currency ? ` · ${order.currency}` : ""}
                    </p>
                    <p className="text-sm font-semibold">
                      {formatCurrency(Number(row.total), moneyOpts)}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="text-sm text-muted-foreground">
                    {items.map((i) => (
                      <li key={i.id}>
                        {i.product_title} × {i.quantity} —{" "}
                        {formatCurrency(Number(i.line_total), moneyOpts)}
                      </li>
                    ))}
                  </ul>
                  <SellerOrderActions
                    orderId={row.order_id}
                    sellerOrderId={row.id}
                    status={row.status}
                    paymentMethod={order?.payment_method}
                    paymentStatus={order?.payment_status}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PaginatedList>
  );
}
