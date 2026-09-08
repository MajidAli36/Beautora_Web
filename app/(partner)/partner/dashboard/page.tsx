import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireAuth } from "@/lib/auth/session";
import { getPartnerDashboard } from "@/lib/actions/partners";
import { PartnerDashboardClient } from "@/components/features/partners/partner-dashboard-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Partner dashboard",
  robots: { index: false, follow: false },
};

export default async function PartnerDashboardPage() {
  const user = await requireAuth();
  const data = await getPartnerDashboard();
  if (!data) {
    const meta = user.user_metadata ?? {};
    if (meta.account_type === "partner") {
      redirect("/partner");
    }
    redirect("/dashboard");
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  return (
    <PartnerDashboardClient
      partner={data.partner}
      stores={data.stores}
      commissions={data.commissions}
      totals={data.totals}
      origin={origin}
    />
  );
}
