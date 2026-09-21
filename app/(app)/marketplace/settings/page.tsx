import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { getMyMarketplaceSeller } from "@/lib/marketplace/actions";
import { SellerStoreSettingsForm } from "@/components/marketplace/seller-store-settings-form";
import { getActiveOrganization } from "@/lib/auth/organization";
import { requireAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function MarketplaceSettingsPage() {
  const user = await requireAuth();
  const seller = await getMyMarketplaceSeller();
  if (!seller) redirect("/marketplace/onboarding");

  const org = await getActiveOrganization();
  let orgStoreEnabled = false;
  if (org?.organizationId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("organizations")
      .select("marketplace_store_enabled")
      .eq("id", org.organizationId)
      .maybeSingle();
    orgStoreEnabled = Boolean(data?.marketplace_store_enabled);
  }

  const paymentBits = [
    seller.accepts_cod ?? seller.supports_cod ? "COD" : null,
    seller.accepts_card ? "Card" : null,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Account settings"
        description="Tabbed control center — account, shop profile, COD terms, card payment details, and storefront."
      />
      <Card className="overflow-hidden border-primary/10 shadow-sm">
        <CardHeader className="gap-3 bg-gradient-to-br from-primary/[0.06] to-transparent sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-display text-xl tracking-tight">
              {seller.shop_name}
            </CardTitle>
            <CardDescription className="mt-1">/{seller.slug}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{seller.status}</Badge>
            {paymentBits.length > 0 ? (
              <Badge variant="secondary">{paymentBits.join(" · ")}</Badge>
            ) : (
              <Badge variant="warning">No payment methods</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <SellerStoreSettingsForm
            seller={seller}
            canToggleOrgStore={
              Boolean(org?.organizationId) && ["OWNER", "ADMIN"].includes(org!.role)
            }
            orgStoreEnabled={orgStoreEnabled}
            accountEmailFallback={user.email}
          />
        </CardContent>
      </Card>
    </div>
  );
}
