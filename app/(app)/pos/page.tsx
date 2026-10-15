import { PageHeader } from "@/components/layout/page-header";
import { redirect } from "next/navigation";
import { getPosCatalog } from "@/lib/actions/products";
import { getAppointmentsForPos } from "@/lib/actions/appointments";
import { canManageRecords, checkAction } from "@/lib/auth/permissions";
import { hasCashDrawerHardware } from "@/lib/devices/cash-drawer";
import { requireOrganization } from "@/lib/auth/organization";
import { PosTerminal } from "@/components/features/pos/pos-terminal";
import { OpenDrawerButton } from "@/components/features/pos/open-drawer-button";

export default async function PosPage() {
  const org = await requireOrganization();
  const [canPos, catalog, appointments, canManage, canMarkNoShow, hasDrawer] =
    await Promise.all([
      checkAction("pos.sell"),
      getPosCatalog(),
      getAppointmentsForPos().catch(() => []),
      canManageRecords(),
      checkAction("appointments.cancel"),
      hasCashDrawerHardware(org.organizationId),
    ]);

  if (!canPos) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Point of Sale"
          description="Link any open appointment, apply advances, checkout to complete — or mark no-show if they never came."
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
        canMarkNoShow={canMarkNoShow}
      />
    </div>
  );
}
