import { PageHeader } from "@/components/layout/page-header";
import { getMyMarketplaceSeller, getSellerPayoutSummary } from "@/lib/marketplace/actions";
import { MarketplaceCommissionsList } from "@/components/marketplace/seller-searchable-lists";
import { SellerPayoutRequestForm } from "@/components/marketplace/seller-payout-request-form";
import { formatCommissionPercent } from "@/lib/marketplace/constants";
import { getDefaultCommissionRate } from "@/lib/marketplace/commission";
import { getSellerLedgerBalance, listSellerLedger } from "@/lib/marketplace/ledger";
import { listMyPayoutRequests } from "@/lib/marketplace/analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MarketplacePayoutsPage() {
  const seller = await getMyMarketplaceSeller();
  if (!seller) redirect("/marketplace/onboarding");
  const [summary, commissionRate, balance, ledger, requests] = await Promise.all([
    getSellerPayoutSummary(),
    getDefaultCommissionRate(),
    getSellerLedgerBalance(seller.id),
    listSellerLedger(seller.id, 20),
    listMyPayoutRequests(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payouts & commission"
        description={`Beautora Marketplace takes ${formatCommissionPercent(commissionRate)}% when an order is delivered (COD). Platform admin records payouts — separate from salon subscription billing.`}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Owed to platform</CardDescription>
            <CardTitle>{formatCurrency(summary.owed)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Commission marked paid</CardDescription>
            <CardTitle>{formatCurrency(summary.paid)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Ledger available</CardDescription>
            <CardTitle>{formatCurrency(balance.available)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Ledger credits</CardDescription>
            <CardTitle>{formatCurrency(balance.credits)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request payout</CardTitle>
          <CardDescription>
            Based on seller ledger balance after delivered orders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SellerPayoutRequestForm available={balance.available} requests={requests} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent ledger</CardTitle>
        </CardHeader>
        <CardContent>
          {ledger.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ledger entries yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {ledger.map((row) => (
                <li key={row.id} className="flex justify-between gap-3 py-2">
                  <span>
                    {row.entry_type}
                    {row.notes ? ` · ${row.notes}` : ""}
                  </span>
                  <span className="font-medium">{formatCurrency(Number(row.amount))}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

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
