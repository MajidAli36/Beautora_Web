import { PageHeader } from "@/components/layout/page-header";
import { getChairs } from "@/lib/actions/chairs";
import { getCapabilities } from "@/lib/auth/permissions";
import { ChairsManager } from "@/components/features/chairs/chairs-manager";

export default async function ChairsPage() {
  const [chairs, caps] = await Promise.all([
    getChairs(true),
    getCapabilities("chairs"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chairs"
        description="Manage salon chairs and stations. Add or remove anytime — they show up on the Queue page."
      />
      <ChairsManager chairs={chairs} canManage={caps.canManage} />
    </div>
  );
}
