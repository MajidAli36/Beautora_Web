import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import {
  getMyMarketplaceSeller,
  getSellerDashboardStats,
} from "@/lib/marketplace/actions";
import { MARKETPLACE_COMMISSION_RATE } from "@/lib/marketplace/constants";
import { BEAUTORA_PRODUCTS, BEAUTORA_PRODUCT_PAIR } from "@/lib/marketing/products";
import { SellerRegisterForm } from "@/components/marketplace/seller-register-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MarketplaceDashboardPage() {
  const seller = await getMyMarketplaceSeller();
  if (!seller) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <PageHeader
          title="Join Beautora Marketplace"
          description={`${BEAUTORA_PRODUCTS.marketplace.description} Completely separate from ${BEAUTORA_PRODUCTS.saas.name} — salon POS stock and reports stay untouched.`}
        />
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardHeader>
            <CardTitle className="text-base">{BEAUTORA_PRODUCT_PAIR.title}</CardTitle>
            <CardDescription>{BEAUTORA_PRODUCT_PAIR.description}</CardDescription>
          </CardHeader>
        </Card>
        <SellerRegisterForm />
      </div>
    );
  }

  const stats = await getSellerDashboardStats();

  return (
    <div className="space-y-6">
      <PageHeader
        title={seller.shop_name}
        description={`${BEAUTORA_PRODUCTS.marketplace.name} seller hub — products, COD orders, and ${MARKETPLACE_COMMISSION_RATE * 100}% platform commission. Not linked to salon sales or finances.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={
                seller.status === "approved"
                  ? "default"
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

      {seller.status === "pending" && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base">Awaiting marketplace approval</CardTitle>
            <CardDescription>
              Platform admin reviews new sellers before your catalog can go live on Beautora Shop.
              You can still draft products while you wait.
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
            <CardDescription>
              Commission owed ({MARKETPLACE_COMMISSION_RATE * 100}%)
            </CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(stats?.owedCommission ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seller toolkit</CardTitle>
          <CardDescription>
            Fulfill online orders here. Switch back to {BEAUTORA_PRODUCTS.saas.name} anytime from the
            workspace menu for bookings and POS.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/marketplace/orders" />}>
            Orders
          </Button>
          <Button variant="outline" render={<Link href="/marketplace/inventory" />}>
            Inventory
          </Button>
          <Button variant="outline" render={<Link href="/marketplace/payouts" />}>
            Payouts
          </Button>
          <Button variant="outline" render={<Link href="/marketplace/reviews" />}>
            Reviews
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
