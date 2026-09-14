import { PageHeader } from "@/components/layout/page-header";
import { getMyMarketplaceSeller, listSellerOrders } from "@/lib/marketplace/actions";
import { MarketplaceOrdersList } from "@/components/marketplace/seller-searchable-lists";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MarketplaceOrdersPage() {
  const seller = await getMyMarketplaceSeller();
  if (!seller) redirect("/marketplace");
  const orders = await listSellerOrders();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace orders"
        description="Cash-on-delivery orders from the public Marketplace shop. Mark delivered to record 10% platform commission."
      />
      <MarketplaceOrdersList orders={orders} />
    </div>
  );
}
