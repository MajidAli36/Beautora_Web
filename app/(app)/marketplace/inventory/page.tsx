import { PageHeader } from "@/components/layout/page-header";
import { getMyMarketplaceSeller, listSellerProducts } from "@/lib/marketplace/actions";
import { MarketplaceInventoryList } from "@/components/marketplace/seller-searchable-lists";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MarketplaceInventoryPage() {
  const seller = await getMyMarketplaceSeller();
  if (!seller) redirect("/marketplace");
  const products = await listSellerProducts();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace inventory"
        description="Online shop stock only — never mixed with Salon Management in-house or POS inventory."
      />
      <MarketplaceInventoryList products={products} />
    </div>
  );
}
