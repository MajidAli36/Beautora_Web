import { PageHeader } from "@/components/layout/page-header";
import { SalonCustomerAppDashboard } from "@/components/features/customer-app/salon-customer-app-dashboard";
import { getSalonCustomerAppDashboard } from "@/lib/actions/customer-apps-salon";
import { requireOrganization } from "@/lib/auth/organization";
import { hasMinimumRole } from "@/lib/permissions/roles";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SalonCustomerAppPage() {
  const org = await requireOrganization();
  if (!hasMinimumRole(org.role, "ADMIN")) {
    redirect("/dashboard");
  }

  const data = await getSalonCustomerAppDashboard();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer app"
        description="App customers, bookings, catalog, deals, points, and leaderboard rewards — separate from salon CRM and marketplace. Bookings still use the shared appointments engine."
      />
      <SalonCustomerAppDashboard
        app={data.app}
        initialDraft={data.config?.draft ?? null}
        checklist={data.checklist}
        loyalty={data.loyalty}
        leaderboard={data.leaderboard}
        reels={data.reels}
        appCustomers={data.appCustomers}
        appBookings={data.appBookings}
        appProducts={data.appProducts}
        appDeals={data.appDeals}
        pointTypes={data.pointTypes}
        leaderboardTiers={data.leaderboardTiers}
        pointsHistory={data.pointsHistory}
        notifications={data.notifications}
        services={data.services}
      />
    </div>
  );
}
