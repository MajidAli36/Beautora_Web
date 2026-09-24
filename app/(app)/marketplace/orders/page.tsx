import { PageHeader } from "@/components/layout/page-header";
import { getMyMarketplaceSeller } from "@/lib/marketplace/actions";
import { listMySellerOrders } from "@/lib/marketplace/fulfillment";
import { listSellerOrders } from "@/lib/marketplace/actions";
import { MarketplaceOrdersList } from "@/components/marketplace/seller-searchable-lists";
import { SellerOrderActions } from "@/components/marketplace/seller-order-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MarketplaceOrdersPage() {
  const seller = await getMyMarketplaceSeller();
  if (!seller) redirect("/marketplace/onboarding");

  const sellerOrders = await listMySellerOrders();
  const legacyOrders = sellerOrders.length === 0 ? await listSellerOrders() : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace orders"
        description="COD and card orders. COD invoices go out when placed; card invoices send after you confirm payment. Update fulfillment independently — commission accrues on delivered."
      />

      {sellerOrders.length > 0 ? (
        <div className="space-y-4">
          {sellerOrders.map((row) => {
            const order = (row as { marketplace_orders?: unknown }).marketplace_orders as
              | {
                  id: string;
                  order_number: string;
                  buyer_name: string;
                  buyer_phone: string;
                  buyer_address: string;
                  payment_method?: string;
                  payment_status?: string;
                  currency?: string | null;
                }
              | null
              | undefined;
            const items = ((row as { marketplace_order_items?: unknown }).marketplace_order_items ??
              []) as Array<{
              id: string;
              product_title: string;
              quantity: number;
              line_total: number;
            }>;
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
                    <p className="text-xs text-muted-foreground">{order?.buyer_address}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline">{row.status}</Badge>
                    <p className="text-xs text-muted-foreground">
                      {order?.payment_method ?? "COD"} · {order?.payment_status ?? "unpaid"}
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
      ) : (
        <MarketplaceOrdersList orders={legacyOrders} />
      )}
    </div>
  );
}
