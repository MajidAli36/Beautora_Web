import { listPlatformPartners } from "@/lib/actions/partners";
import { PlatformPartnersPanel } from "@/components/platform/platform-partners-panel";
import { PlatformAdminSubheader } from "@/components/platform/platform-admin-subheader";

export const dynamic = "force-dynamic";

export default async function PlatformPartnersPage() {
  const partners = await listPlatformPartners();

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <PlatformAdminSubheader
        title="All partners"
        description="Search and approve partner applications. Approved partners earn referral commission on first invoices."
      />
      <PlatformPartnersPanel partners={partners} enableSearch />
    </div>
  );
}
