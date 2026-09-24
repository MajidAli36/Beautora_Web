import { requireAuth } from "@/lib/auth/session";
import { isPlatformAdminEmail } from "@/lib/billing/subscription";
import { redirect } from "next/navigation";
import { getMarketplaceSettings } from "@/lib/marketplace/settings";
import {
  getPlatformMarketplaceMetrics,
  listPlatformPayoutRequests,
} from "@/lib/marketplace/admin";
import { PlatformMarketplaceAdminClient } from "@/components/platform/platform-marketplace-admin";
import {
  listPlatformMarketplaceCommissions,
  listPlatformMarketplaceReviews,
  listPlatformMarketplaceSellers,
  listPlatformPendingProducts,
} from "@/lib/marketplace/actions";
import { PlatformMarketplacePanel } from "@/components/platform/platform-marketplace-panel";
import { PlatformAdminSubheader } from "@/components/platform/platform-admin-subheader";

export const dynamic = "force-dynamic";

export default async function PlatformMarketplacePage() {
  const user = await requireAuth();
  if (!isPlatformAdminEmail(user.email)) redirect("/");

  const [settings, metrics, payoutRequests, sellers, products, commissions, reviews] =
    await Promise.all([
      getMarketplaceSettings(),
      getPlatformMarketplaceMetrics(),
      listPlatformPayoutRequests(),
      listPlatformMarketplaceSellers(),
      listPlatformPendingProducts(),
      listPlatformMarketplaceCommissions(),
      listPlatformMarketplaceReviews(),
    ]);

  const requests = payoutRequests.map((r) => ({
    id: r.id,
    amount: Number(r.amount),
    status: r.status,
    method: r.method,
    created_at: r.created_at,
    marketplace_sellers: ((r as { marketplace_sellers?: unknown }).marketplace_sellers as
      | {
          shop_name: string;
          slug: string;
        }
      | null) ?? null,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
      <PlatformAdminSubheader
        title="Marketplace admin"
        description="Settings, commissions, payouts, and moderation — separate from salon SaaS billing."
      />

      <PlatformMarketplaceAdminClient
        settings={settings}
        metrics={metrics}
        payoutRequests={requests}
      />

      <PlatformMarketplacePanel
        sellers={sellers}
        products={products}
        commissions={commissions}
        reviews={reviews}
        enableSearch
      />
    </div>
  );
}
