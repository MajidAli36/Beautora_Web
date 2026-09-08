import { PageHeader } from "@/components/layout/page-header";
import { redirect } from "next/navigation";
import { getPosCatalog } from "@/lib/actions/products";
import { getAppointmentsForPos } from "@/lib/actions/appointments";
import { canUsePos, canManageRecords } from "@/lib/auth/permissions";
import { hasCashDrawerHardware } from "@/lib/devices/cash-drawer";
import { requireOrganization } from "@/lib/auth/organization";
import { PosTerminal } from "@/components/features/pos/pos-terminal";
import { OpenDrawerButton } from "@/components/features/pos/open-drawer-button";

export default async function PosPage() {
  const canPos = await canUsePos();
  if (!canPos) redirect("/dashboard");

  const org = await requireOrganization();
  const [catalog, appointments, canManage, hasDrawer] = await Promise.all([
    getPosCatalog(),
    getAppointmentsForPos().catch(() => []),
    canManageRecords(),
    hasCashDrawerHardware(org.organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
        title="Point of Sale"
        description="Today’s appointments only. Add items, apply advances, and checkout."
      />
        <OpenDrawerButton hasDrawer={hasDrawer} source="pos" />
      </div>
      <PosTerminal
        services={catalog.services}
        products={catalog.products}
        packages={catalog.packages}
        customers={catalog.customers}
        staff={catalog.staff}
        appointments={appointments}
        canManage={canManage}
      />
    </div>
  );
}
