import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import {
  getMyMarketplaceSeller,
  getSellerDashboardStats,
} from "@/lib/marketplace/actions";
import { formatCommissionPercent } from "@/lib/marketplace/constants";
import { getDefaultCommissionRate } from "@/lib/marketplace/commission";
import { BEAUTORA_PRODUCTS } from "@/lib/marketing/products";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MarketplaceDashboardPage() {
  const seller = await getMyMarketplaceSeller();
  if (!seller) redirect("/marketplace/onboarding");

  const [stats, commissionRate] = await Promise.all([
    getSellerDashboardStats(),
    getDefaultCommissionRate(),
  ]);
  const commissionLabel = formatCommissionPercent(commissionRate);
  const inv = stats?.inventory;

  return (
    <div className="space-y-6">
      <PageHeader
        title={seller.shop_name}
        description={`${BEAUTORA_PRODUCTS.marketplace.name} seller hub — products, COD orders, and ${commissionLabel}% platform commission. Not linked to salon sales or finances.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={
                seller.status === "approved"
                  ? "success"
                  : seller.status === "suspended"
                    ? "destructive"
                    : "secondary"
              }
            >
              {seller.status}
            </Badge>
            <Button variant="outline" render={<Link href="/shop" target="_blank" />}>
              Open public shop
            </Button>
            <Button render={<Link href="/marketplace/products" />}>Manage products</Button>
          </div>
        }
      />

      {seller.status === "suspended" && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-base">Marketplace seller suspended</CardTitle>
            <CardDescription>
              Your shop is paused by platform admin. Contact Beautora support if you need this
              reviewed.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open COD orders</CardDescription>
            <CardTitle className="text-2xl">{stats?.openOrders ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Commission owed ({commissionLabel}%)</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(stats?.owedCommission ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Products on sale</CardDescription>
            <CardTitle className="text-2xl">{inv?.productsOnSale ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-tight">
          Catalog & inventory value
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Stock valuations are estimates of current inventory (qty × cost / effective
          price) — not realized sales or profit.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total products</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {inv?.totalProducts ?? 0}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {inv?.activeProducts ?? 0} published
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Units in stock</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {inv?.totalUnitsInStock ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Inventory cost value</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatCurrency(inv?.inventoryCostValue ?? 0)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Potential sales value</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatCurrency(inv?.potentialSalesValue ?? 0)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Potential gross profit</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatCurrency(inv?.potentialGrossProfit ?? 0)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Sales value − cost (before platform fee)
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                Est. seller net after {commissionLabel}% fee
              </CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatCurrency(inv?.sellerNetProfit ?? inv?.potentialGrossProfit ?? 0)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {(stats?.commissionRate ?? 0) <= 0
                ? "Commission is 0% now — full amount stays with you"
                : `After ~${formatCurrency(inv?.commissionAmount ?? 0)} platform fee on sales value`}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg. discount %</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {inv?.averageDiscountPercentage ?? 0}%
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Across products currently on sale
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick links</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" render={<Link href="/marketplace/orders" />}>
            Orders
          </Button>
          <Button variant="outline" size="sm" render={<Link href="/marketplace/payouts" />}>
            Payouts
          </Button>
          <Button variant="outline" size="sm" render={<Link href="/marketplace/analytics" />}>
            Analytics
          </Button>
          <Button variant="outline" size="sm" render={<Link href="/marketplace/settings" />}>
            Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
