import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { getMyMarketplaceSeller } from "@/lib/marketplace/actions";
import { getSellerAnalyticsSummary } from "@/lib/marketplace/analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function MarketplaceAnalyticsPage() {
  const seller = await getMyMarketplaceSeller();
  if (!seller) redirect("/marketplace/onboarding");
  const stats = await getSellerAnalyticsSummary(seller.id, 30);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Last 30 days of marketplace storefront activity (views, add-to-cart, purchases)."
        actions={
          <Button variant="outline" render={<Link href={`/shop/seller/${seller.slug}`} target="_blank" />}>
            Open storefront
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Views</CardDescription>
            <CardTitle className="text-2xl">{stats.views}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Add to cart</CardDescription>
            <CardTitle className="text-2xl">{stats.addToCart}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Purchases</CardDescription>
            <CardTitle className="text-2xl">{stats.purchases}</CardTitle>
          </CardHeader>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tips</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Publish more products, add images, and keep stock updated to improve conversion. Events
          are recorded when shoppers view products or complete COD checkout.
        </CardContent>
      </Card>
    </div>
  );
}
