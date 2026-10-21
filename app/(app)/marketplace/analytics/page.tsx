import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { getMyMarketplaceSeller } from "@/lib/marketplace/actions";
import {
  getSellerAnalyticsSummary,
  getSellerPricingAnalytics,
} from "@/lib/marketplace/analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { formatCommissionPercent } from "@/lib/marketplace/constants";

export const dynamic = "force-dynamic";

export default async function MarketplaceAnalyticsPage() {
  const seller = await getMyMarketplaceSeller();
  if (!seller) redirect("/marketplace/onboarding");
  const [stats, pricing] = await Promise.all([
    getSellerAnalyticsSummary(seller.id, 30),
    getSellerPricingAnalytics(seller.id, 30),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Storefront activity plus inventory valuations and realized gross profit from order snapshots (last 30 days)."
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

      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-tight">
          Realized sales (30 days)
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Gross profit = (charged unit price − cost snapshot) × qty. Cancelled
          orders are excluded. Platform fee is estimated on revenue using the
          current rate ({formatCommissionPercent(pricing.commissionRate)}%) —
          {(pricing.commissionRate ?? 0) <= 0
            ? " right now that is 0%, so all money stays in your seller account."
            : " deducted from gross profit for “seller net”."}
          {pricing.costSnapshotCoverage.missingHistoricalNote
            ? " Some older lines may lack a true historical cost (soft backfill)."
            : null}
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Sales revenue</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatCurrency(pricing.realizedRevenue)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Cost of goods (snapshot)</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatCurrency(pricing.realizedCogs)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Gross profit</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatCurrency(pricing.realizedGrossProfit)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Before platform fee
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                Est. platform fee ({formatCommissionPercent(pricing.commissionRate)}%)
              </CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatCurrency(pricing.estimatedPlatformCommission)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Seller net proceeds</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatCurrency(pricing.sellerNetProceeds)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Revenue after platform fee
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Seller net profit</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatCurrency(pricing.sellerNetProfit)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Gross profit − platform fee
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top products by gross profit</CardTitle>
            <CardDescription>From order-item snapshots</CardDescription>
          </CardHeader>
          <CardContent>
            {pricing.topByProfit.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales in this period.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {pricing.topByProfit.map((row) => (
                  <li key={`${row.productId ?? row.title}`} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate font-medium">{row.title}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatCurrency(row.grossProfit)} · {row.quantity} sold
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Highest catalog margins</CardTitle>
            <CardDescription>Based on current effective price vs cost</CardDescription>
          </CardHeader>
          <CardContent>
            {pricing.highestMarginProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add cost and selling prices in Product Studio.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {pricing.highestMarginProducts.map((row) => (
                  <li key={row.id} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate font-medium">{row.title}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {row.marginPct}% · {formatCurrency(row.profitPerUnit)}/u
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Products on discount</CardTitle>
          </CardHeader>
          <CardContent>
            {pricing.onDiscount.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active discounts.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {pricing.onDiscount.map((row) => (
                  <li key={row.id} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate font-medium">{row.title}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      −{row.discountPct}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Low stock</CardTitle>
          </CardHeader>
          <CardContent>
            {pricing.lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">All SKUs above alert threshold.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {pricing.lowStock.map((row) => (
                  <li key={row.id} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate font-medium">{row.title}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {row.stock} left
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inventory snapshot</CardTitle>
          <CardDescription>
            Potential values of current stock — not realized revenue
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <div>
            <p className="text-muted-foreground">Cost value</p>
            <p className="font-semibold tabular-nums">
              {formatCurrency(pricing.inventory.inventoryCostValue)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Potential sales</p>
            <p className="font-semibold tabular-nums">
              {formatCurrency(pricing.inventory.potentialSalesValue)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Potential gross profit</p>
            <p className="font-semibold tabular-nums">
              {formatCurrency(pricing.inventory.potentialGrossProfit)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">
              Est. platform fee ({formatCommissionPercent(pricing.commissionRate)}%)
            </p>
            <p className="font-semibold tabular-nums">
              {formatCurrency(pricing.inventory.commissionAmount)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Est. seller net profit</p>
            <p className="font-semibold tabular-nums">
              {formatCurrency(pricing.inventory.sellerNetProfit)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">On sale / units</p>
            <p className="font-semibold tabular-nums">
              {pricing.inventory.productsOnSale} · {pricing.inventory.totalUnitsInStock}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
