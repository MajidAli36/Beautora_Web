import { PageHeader } from "@/components/layout/page-header";
import { MarketplaceOnboardingWizard } from "@/components/marketplace/onboarding-wizard";
import { getMyMarketplaceSeller } from "@/lib/marketplace/actions";
import { getActiveOrganization } from "@/lib/auth/organization";

export const dynamic = "force-dynamic";

export default async function MarketplaceOnboardingPage() {
  const [seller, org] = await Promise.all([
    getMyMarketplaceSeller(),
    getActiveOrganization(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace onboarding"
        description="Set up your Beautora Marketplace shop in a few steps."
      />
      <MarketplaceOnboardingWizard
        hasSeller={Boolean(seller)}
        hasOrg={Boolean(org?.organizationId)}
      />
    </div>
  );
}
