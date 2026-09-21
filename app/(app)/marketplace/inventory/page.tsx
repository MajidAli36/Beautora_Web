import Link from "next/link";
import { AlertTriangle, Boxes, PackageCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { getMyMarketplaceSeller, listSellerProducts } from "@/lib/marketplace/actions";
import { MarketplaceInventoryList } from "@/components/marketplace/seller-searchable-lists";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MarketplaceInventoryPage() {
  const seller = await getMyMarketplaceSeller();
  if (!seller) redirect("/marketplace");
  const products = await listSellerProducts();

  const totalUnits = products.reduce((s, p) => s + Number(p.stock ?? 0), 0);
  const lowStock = products.filter((p) => {
    const stock = Number(p.stock ?? 0);
    const threshold = Number(
      (p as { low_stock_threshold?: number }).low_stock_threshold ?? 3
    );
    return stock <= threshold;
  });
  const outOfStock = products.filter((p) => Number(p.stock ?? 0) <= 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Marketplace inventory"
        description="Online shop stock only — never mixed with Salon Management in-house or POS inventory. Adjust quantities here; orders deduct marketplace stock on checkout."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Boxes className="size-4" /> SKUs
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{products.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {totalUnits} units across catalog
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-600" /> Low stock
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums text-amber-700">
              {lowStock.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            At or below low-stock alert
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <PackageCheck className="size-4" /> Out of stock
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{outOfStock.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Buyers cannot purchase until restocked
          </CardContent>
        </Card>
      </div>

      {lowStock.length > 0 ? (
        <Card className="border-amber-200/80 bg-amber-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Needs attention</CardTitle>
            <CardDescription>
              Restock these before they miss marketplace orders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {lowStock.slice(0, 8).map((p) => (
                <li key={p.id} className="flex justify-between gap-3">
                  <span className="truncate font-medium">{p.title}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {p.stock} left
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Stock levels</h2>
        <Button variant="outline" size="sm" render={<Link href="/marketplace/products" />}>
          Open product studio
        </Button>
      </div>

      <MarketplaceInventoryList products={products} />
    </div>
  );
}
