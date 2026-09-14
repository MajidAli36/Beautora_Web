import { PageHeader } from "@/components/layout/page-header";
import { getMyMarketplaceSeller, getSellerPayoutSummary } from "@/lib/marketplace/actions";
import { MARKETPLACE_COMMISSION_RATE } from "@/lib/marketplace/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
          {summary.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No commissions yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {summary.rows.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="font-medium">{formatCurrency(Number(r.commission_amount))}</p>
                    <p className="text-xs text-muted-foreground">
                      Gross {formatCurrency(Number(r.gross_amount))} · rate{" "}
                      {(Number(r.rate) * 100).toFixed(0)}%
                    </p>
                  </div>
                  <Badge variant={r.payout_status === "paid" ? "default" : "secondary"}>
                    {r.payout_status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
