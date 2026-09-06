import { PageHeader } from "@/components/layout/page-header";
import { getChairs } from "@/lib/actions/chairs";
import { canManageRecords } from "@/lib/auth/permissions";
import { ChairsManager } from "@/components/features/chairs/chairs-manager";

export default async function ChairsPage() {
  const [chairs, canManage] = await Promise.all([getChairs(true), canManageRecords()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chairs"
        description="Manage salon chairs and stations. Add or remove anytime — they show up on the Queue page."
      />
      <ChairsManager chairs={chairs} canManage={canManage} />
    </div>
  );
}
