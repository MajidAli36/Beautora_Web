import Link from "next/link";
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
    marketplace_sellers: (r.marketplace_sellers as {
      shop_name: string;
      slug: string;
    } | null) ?? null,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Platform
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Marketplace admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Settings, commissions, payouts, and moderation — separate from salon SaaS billing.
          </p>
        </div>
        <Link href="/platform" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          ← SaaS platform
        </Link>
      </div>

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
      />
    </div>
  );
}
