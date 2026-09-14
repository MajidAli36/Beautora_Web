import { PageHeader } from "@/components/layout/page-header";
import { getMyMarketplaceSeller, listSellerOrders } from "@/lib/marketplace/actions";
import { SellerOrderActions } from "@/components/marketplace/seller-order-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MarketplaceOrdersPage() {
  const seller = await getMyMarketplaceSeller();
  if (!seller) redirect("/marketplace");
  const orders = await listSellerOrders();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace orders"
        description="Cash-on-delivery orders from the public Marketplace shop. Mark delivered to record 10% platform commission."
      />
      <div className="space-y-4">
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          orders.map(({ order, items, sellerTotal }) => (
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
                  <p className="text-sm font-semibold">{formatCurrency(sellerTotal)}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="text-sm text-muted-foreground">
                  {items.map((i) => (
                    <li key={i.id}>
                      {i.product_title} × {i.quantity} — {formatCurrency(Number(i.line_total))}
                    </li>
                  ))}
                </ul>
                <SellerOrderActions orderId={order.id} status={order.status} />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
