import { PageHeader } from "@/components/layout/page-header";
import {
  getMyMarketplaceSeller,
  listMarketplaceCategories,
  listSellerProducts,
} from "@/lib/marketplace/actions";
import { SellerProductForm } from "@/components/marketplace/seller-product-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MarketplaceProductsPage() {
  const seller = await getMyMarketplaceSeller();
  if (!seller) redirect("/marketplace");

  const [products, categories] = await Promise.all([
    listSellerProducts(),
    listMarketplaceCategories(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace products"
        description="Catalog for Beautora Marketplace only. Does not change Salon Management POS or in-house stock."
      />
      <SellerProductForm categories={categories} />
      <div className="grid gap-3">
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">No products yet.</p>
        ) : (
          products.map((p) => (
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
                  <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                </CardContent>
              ) : null}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
