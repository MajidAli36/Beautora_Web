import { PageHeader } from "@/components/layout/page-header";
import { getMyMarketplaceSeller, listSellerReviews } from "@/lib/marketplace/actions";
import { MarketplaceReviewsList } from "@/components/marketplace/seller-searchable-lists";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MarketplaceReviewsPage() {
  const seller = await getMyMarketplaceSeller();
  if (!seller) redirect("/marketplace");
  const reviews = await listSellerReviews();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product reviews"
        description="Shopper feedback on your Marketplace listings. Platform admin can hide abusive reviews."
      />
      <MarketplaceReviewsList reviews={reviews} />
    </div>
  );
}
