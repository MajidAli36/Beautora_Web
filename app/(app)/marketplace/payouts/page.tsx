import { PageHeader } from "@/components/layout/page-header";
import { getMyMarketplaceSeller, getSellerPayoutSummary } from "@/lib/marketplace/actions";
import { MarketplaceCommissionsList } from "@/components/marketplace/seller-searchable-lists";
import { MARKETPLACE_COMMISSION_RATE } from "@/lib/marketplace/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MarketplacePayoutsPage() {
  const seller = await getMyMarketplaceSeller();
  if (!seller) redirect("/marketplace");
  const summary = await getSellerPayoutSummary();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payouts & commission"
        description={`Beautora Marketplace takes ${MARKETPLACE_COMMISSION_RATE * 100}% when an order is delivered (COD). Platform admin records payouts — separate from salon subscription billing.`}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Owed to platform</CardDescription>
            <CardTitle>{formatCurrency(summary.owed)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Marked paid</CardDescription>
            <CardTitle>{formatCurrency(summary.paid)}</CardTitle>
          </CardHeader>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Commission ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <MarketplaceCommissionsList rows={summary.rows} />
        </CardContent>
      </Card>
    </div>
  );
}
