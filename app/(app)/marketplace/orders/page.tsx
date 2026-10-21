import { PageHeader } from "@/components/layout/page-header";
import { getMyMarketplaceSeller } from "@/lib/marketplace/actions";
import { listMySellerOrders } from "@/lib/marketplace/fulfillment";
import { listSellerOrders } from "@/lib/marketplace/actions";
import { MarketplaceOrdersList } from "@/components/marketplace/seller-searchable-lists";
import { MarketplaceSellerOrdersList } from "@/components/marketplace/marketplace-seller-orders-list";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MarketplaceOrdersPage() {
  const seller = await getMyMarketplaceSeller();
  if (!seller) redirect("/marketplace/onboarding");

  const sellerOrders = await listMySellerOrders();
  const legacyOrders = sellerOrders.length === 0 ? await listSellerOrders() : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace orders"
        description="COD and card orders. COD invoices go out when placed; card invoices send after you confirm payment. Update fulfillment independently — commission accrues on delivered."
      />

      {sellerOrders.length > 0 ? (
        <MarketplaceSellerOrdersList orders={sellerOrders} />
      ) : (
        <MarketplaceOrdersList orders={legacyOrders} />
      )}
    </div>
  );
}
