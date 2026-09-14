import { PageHeader } from "@/components/layout/page-header";
import { getMyMarketplaceSeller } from "@/lib/marketplace/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MarketplaceSettingsPage() {
  const seller = await getMyMarketplaceSeller();
  if (!seller) redirect("/marketplace");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        title="Shop settings"
        description="Your Beautora Marketplace seller profile. Switch to Salon Management anytime from the workspace menu for bookings and POS."
      />
      <Card>
        <CardHeader>
          <CardTitle>{seller.shop_name}</CardTitle>
          <CardDescription>/{seller.slug}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Status</span>
            <Badge variant="outline">{seller.status}</Badge>
          </div>
          {seller.bio ? <p>{seller.bio}</p> : null}
          <p className="text-xs text-muted-foreground">
            Contact Beautora platform admin to change shop name, suspend, or update payout notes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
