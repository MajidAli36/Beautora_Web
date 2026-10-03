import {
  listPlatformPayments,
  listPlatformStores,
  listPlatformUsers,
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
import { PLATFORM_DASHBOARD_PREVIEW } from "@/lib/platform/dashboard-preview";

export const dynamic = "force-dynamic";

export default async function PlatformAdminPage() {
  const user = await requireAuth();
  const [
    stores,
    payments,
    partners,
    users,
    mpSellers,
    mpProducts,
    mpCommissions,
    mpReviews,
  ] = await Promise.all([
    listPlatformStores(),
    listPlatformPayments("all"),
    listPlatformPartners(),
    listPlatformUsers(),
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
    userCount: users.length,
    pendingUsers: users.filter((u) => u.status === "pending").length,
    monthlyFee: SUBSCRIPTION.monthlyAmountPkr,
  };

  return (
    <>
      <PlatformAdminPanel
        stores={stores.slice(0, PLATFORM_DASHBOARD_PREVIEW)}
        storesTotal={stores.length}
        payments={payments}
        partners={partners}
        users={users.slice(0, PLATFORM_DASHBOARD_PREVIEW)}
        usersTotal={users.length}
        summary={summary}
        adminEmail={user.email ?? ""}
      />
      <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
        <PlatformMarketplacePanel
          sellers={mpSellers}
          products={mpProducts}
          commissions={mpCommissions}
          reviews={mpReviews}
          previewLimit={PLATFORM_DASHBOARD_PREVIEW}
          viewAllHref="/platform/marketplace"
          compact
        />
      </div>
    </>
  );
}
