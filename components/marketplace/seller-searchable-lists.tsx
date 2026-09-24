"use client";

import { InventoryAdjustForm } from "@/components/marketplace/inventory-adjust-form";
import { SellerOrderActions } from "@/components/marketplace/seller-order-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaginatedList } from "@/components/ui/table-pagination";
import { formatCurrency } from "@/lib/format";

type MarketplaceProduct = {
  id: string;
  title: string;
  description: string | null;
  price: number | string;
  stock: number;
  status: string;
  low_stock_threshold?: number | null;
};

type OrderItem = {
  id: string;
  product_title: string;
  quantity: number;
  line_total: number | string;
};

type MarketplaceOrderGroup = {
  order: {
    id: string;
    order_number: string;
    buyer_name: string;
    buyer_phone: string;
    buyer_address: string;
    status: string;
    payment_method?: string;
    payment_status?: string;
    currency?: string | null;
  };
  items: OrderItem[];
  sellerTotal: number;
};

type MarketplaceReview = {
  id: string;
  product_title: string;
  rating: number;
  reviewer_name: string;
  comment: string | null;
  is_hidden: boolean;
};

type CommissionRow = {
  id: string;
  commission_amount: number | string;
  gross_amount: number | string;
  rate: number | string;
  payout_status: string;
};

export function MarketplaceProductsList({ products }: { products: MarketplaceProduct[] }) {
  return (
    <PaginatedList
      items={products}
      empty={<p className="text-sm text-muted-foreground">No products yet.</p>}
      search={{
        placeholder: "Search title, status, stock…",
        getText: (p) =>
          [p.title, p.description ?? "", p.status, String(p.stock), String(p.price)].join(" "),
      }}
    >
      {(slice) => (
        <div className="grid gap-3">
          {slice.map((p) => (
            <Card key={p.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base">{p.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(Number(p.price))} · Stock {p.stock}
                  </p>
                </div>
                <Badge variant="outline">{p.status}</Badge>
              </CardHeader>
              {p.description ? (
                <CardContent>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                </CardContent>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </PaginatedList>
  );
}

export function MarketplaceOrdersList({ orders }: { orders: MarketplaceOrderGroup[] }) {
  return (
    <PaginatedList
      items={orders}
      empty={<p className="text-sm text-muted-foreground">No orders yet.</p>}
      search={{
        placeholder: "Search order, buyer, product, status…",
        getText: ({ order, items, sellerTotal }) =>
          [
            order.order_number,
            order.buyer_name,
            order.buyer_phone,
            order.buyer_address,
            order.status,
            String(sellerTotal),
            ...items.map((i) => i.product_title),
          ].join(" "),
      }}
    >
      {(slice) => (
        <div className="space-y-4">
          {slice.map(({ order, items, sellerTotal }) => {
            const moneyOpts = { currency: order.currency ?? undefined };
            return (
            <Card key={order.id}>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-base">{order.order_number}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {order.buyer_name} · {order.buyer_phone}
                  </p>
                  <p className="text-xs text-muted-foreground">{order.buyer_address}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline">{order.status}</Badge>
                  <p className="text-xs text-muted-foreground">
                    {order.payment_method ?? "COD"} · {order.payment_status ?? "unpaid"}
                    {order.currency ? ` · ${order.currency}` : ""}
                  </p>
                  <p className="text-sm font-semibold">
                    {formatCurrency(sellerTotal, moneyOpts)}
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
                  orderId={order.id}
                  status={order.status}
                  paymentMethod={order.payment_method}
                  paymentStatus={order.payment_status}
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

export function MarketplaceInventoryList({ products }: { products: MarketplaceProduct[] }) {
  return (
    <PaginatedList
      items={products}
      empty={<li className="p-4 text-sm text-muted-foreground">No products.</li>}
      search={{
        placeholder: "Search product, status, stock…",
        getText: (p) => [p.title, p.status, String(p.stock), String(p.price)].join(" "),
      }}
    >
      {(slice) => (
        <ul className="divide-y rounded-xl border bg-card">
          {slice.map((p) => {
            const threshold = Number(p.low_stock_threshold ?? 3);
            const stock = Number(p.stock);
            const tone =
              stock <= 0 ? "out" : stock <= threshold ? "low" : "ok";
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">{p.title}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatCurrency(Number(p.price))}</span>
                    <Badge variant="outline">{p.status}</Badge>
                    {tone === "out" ? (
                      <Badge variant="destructive">Out of stock</Badge>
                    ) : tone === "low" ? (
                      <Badge variant="warning">Low · ≤{threshold}</Badge>
                    ) : (
                      <Badge variant="success">Healthy</Badge>
                    )}
                  </div>
                </div>
                <InventoryAdjustForm productId={p.id} stock={stock} />
              </li>
            );
          })}
        </ul>
      )}
    </PaginatedList>
  );
}

export function MarketplaceReviewsList({ reviews }: { reviews: MarketplaceReview[] }) {
  return (
    <PaginatedList
      items={reviews}
      empty={<p className="text-sm text-muted-foreground">No reviews yet.</p>}
      search={{
        placeholder: "Search product, reviewer, comment…",
        getText: (r) =>
          [
            r.product_title,
            r.reviewer_name,
            r.comment ?? "",
            String(r.rating),
            r.is_hidden ? "hidden" : "",
          ].join(" "),
      }}
    >
      {(slice) => (
        <div className="space-y-3">
          {slice.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {r.product_title} · {r.rating}/5
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {r.reviewer_name}
                  {r.is_hidden ? " · hidden" : ""}
                </p>
              </CardHeader>
              {r.comment ? (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{r.comment}</p>
                </CardContent>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </PaginatedList>
  );
}

export function MarketplaceCommissionsList({ rows }: { rows: CommissionRow[] }) {
  return (
    <PaginatedList
      items={rows}
      empty={<p className="text-sm text-muted-foreground">No commissions yet.</p>}
      search={{
        placeholder: "Search amount or payout status…",
        getText: (r) =>
          [
            String(r.commission_amount),
            String(r.gross_amount),
            r.payout_status,
            String(r.rate),
          ].join(" "),
      }}
    >
      {(slice) => (
        <ul className="divide-y text-sm">
          {slice.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="font-medium">{formatCurrency(Number(r.commission_amount))}</p>
                <p className="text-xs text-muted-foreground">
                  Gross {formatCurrency(Number(r.gross_amount))} · rate{" "}
                  {(Number(r.rate) * 100).toFixed(0)}%
                </p>
              </div>
              <Badge variant={r.payout_status === "paid" ? "default" : "secondary"}>
                {r.payout_status}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </PaginatedList>
  );
}
