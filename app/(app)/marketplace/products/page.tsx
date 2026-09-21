import { PageHeader } from "@/components/layout/page-header";
import {
  getMyMarketplaceSeller,
  listMarketplaceCategories,
  listSellerProducts,
} from "@/lib/marketplace/actions";
import { SellerProductStudio } from "@/components/marketplace/seller-product-studio";
import { MarketplaceProductsList } from "@/components/marketplace/seller-searchable-lists";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MarketplaceProductsPage() {
  const seller = await getMyMarketplaceSeller();
  if (!seller) redirect("/marketplace/onboarding");

  const [products, categories] = await Promise.all([
    listSellerProducts(),
    listMarketplaceCategories(),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        title="Marketplace products"
        description="Next-level catalog for Beautora Marketplace — multi-image gallery, product video, TikTok reel, and rich description. Does not change Salon POS stock."
      />
      <SellerProductStudio categories={categories} />
      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Your catalog</h2>
        <MarketplaceProductsList products={products} />
      </div>
    </div>
  );
}
