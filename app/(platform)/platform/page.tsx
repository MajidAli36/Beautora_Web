import {
  listPlatformPayments,
  listPlatformStores,
} from "@/lib/actions/platform-admin";
import { listPlatformPartners } from "@/lib/actions/partners";
import { requireAuth } from "@/lib/auth/session";
import { PlatformAdminPanel } from "@/components/platform/platform-admin-panel";
import { SUBSCRIPTION } from "@/lib/billing/subscription";

export const dynamic = "force-dynamic";

export default async function PlatformAdminPage() {
  const user = await requireAuth();
  const [stores, payments, partners] = await Promise.all([
    listPlatformStores(),
    listPlatformPayments("all"),
    listPlatformPartners(),
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
    <PlatformAdminPanel
      stores={stores}
      payments={payments}
      partners={partners}
      summary={summary}
      adminEmail={user.email ?? ""}
    />
  );
}
