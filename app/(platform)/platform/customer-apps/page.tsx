import { PlatformAdminSubheader } from "@/components/platform/platform-admin-subheader";
import { PlatformCustomerAppsPanel } from "@/components/platform/platform-customer-apps-panel";
import {
  platformListCustomerApps,
  platformListOrgsWithoutApp,
} from "@/lib/actions/customer-apps-platform";

export const dynamic = "force-dynamic";

export default async function PlatformCustomerAppsPage() {
  const [apps, orgsWithoutApp] = await Promise.all([
    platformListCustomerApps(),
    platformListOrgsWithoutApp(),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <PlatformAdminSubheader
        title="Customer apps"
        description="Enable, configure, publish, or suspend branded customer apps for salons. Mobile + web use the same Customer API."
      />
      <PlatformCustomerAppsPanel apps={apps} orgsWithoutApp={orgsWithoutApp} />
    </div>
  );
}
