import { PageHeader } from "@/components/layout/page-header";
import {
  getMyMarketplaceSeller,
  listMarketplaceCategories,
  listSellerProducts,
} from "@/lib/marketplace/actions";
import { SellerProductForm } from "@/components/marketplace/seller-product-form";
import { MarketplaceProductsList } from "@/components/marketplace/seller-searchable-lists";
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
      <MarketplaceProductsList products={products} />
    </div>
  );
}
