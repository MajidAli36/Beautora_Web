import {
  listPlatformPayments,
  listPlatformStores,
} from "@/lib/actions/platform-admin";
import { listPlatformPartners } from "@/lib/actions/partners";
import {
  listPlatformMarketplaceCommissions,
  listPlatformMarketplaceReviews,
  listPlatformMarketplaceSellers,
  listPlatformPendingProducts,
} from "@/lib/marketplace/actions";
import { requireAuth } from "@/lib/auth/session";
import { PlatformAdminPanel } from "@/components/platform/platform-admin-panel";
import { PlatformMarketplacePanel } from "@/components/platform/platform-marketplace-panel";
import { SUBSCRIPTION } from "@/lib/billing/subscription";

export const dynamic = "force-dynamic";

export default async function PlatformAdminPage() {
  const user = await requireAuth();
  const [stores, payments, partners, mpSellers, mpProducts, mpCommissions, mpReviews] =
    await Promise.all([
      listPlatformStores(),
      listPlatformPayments("all"),
      listPlatformPartners(),
      listPlatformMarketplaceSellers(),
      listPlatformPendingProducts(),
      listPlatformMarketplaceCommissions(),
      listPlatformMarketplaceReviews(),
    ]);

  const summary = {
    storeCount: stores.length,
    disabledCount: stores.filter((s) => s.adminDisabled || s.phase === "locked").length,
    lifetimeCount: stores.filter((s) => s.lifetimeAccess && !s.adminDisabled).length,
    pendingInvoices: payments.filter((p) => p.status === "pending").length,
    pendingPartners: partners.filter((p) => p.status === "pending").length,
    monthlyFee: SUBSCRIPTION.monthlyAmountPkr,
  };

  return (
    <>
      <PlatformAdminPanel
        stores={stores}
        payments={payments}
        partners={partners}
        summary={summary}
        adminEmail={user.email ?? ""}
      />
      <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
        <PlatformMarketplacePanel
          sellers={mpSellers}
          products={mpProducts}
          commissions={mpCommissions}
          reviews={mpReviews}
        />
      </div>
    </>
  );
}
