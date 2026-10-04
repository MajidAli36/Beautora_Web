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
            <CardDescription>Listed products</CardDescription>
            <CardTitle className="text-2xl">{stats?.productCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
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
