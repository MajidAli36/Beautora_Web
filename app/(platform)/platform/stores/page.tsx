import { listPlatformStores } from "@/lib/actions/platform-admin";
import { PlatformStoresPanel } from "@/components/platform/platform-stores-panel";
import { PlatformAdminSubheader } from "@/components/platform/platform-admin-subheader";

export const dynamic = "force-dynamic";

export default async function PlatformStoresPage() {
  const stores = await listPlatformStores();

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <PlatformAdminSubheader
        title="All stores"
        description="Search and manage every salon on the platform — billing state, lifetime access, and full details."
      />
      <PlatformStoresPanel stores={stores} enableSearch />
    </div>
  );
}
