import { notFound } from "next/navigation";
import { PlatformAdminSubheader } from "@/components/platform/platform-admin-subheader";
import { PlatformCustomerAppDetail } from "@/components/platform/platform-customer-app-detail";
import { platformGetCustomerAppDetail } from "@/lib/actions/customer-apps-platform";

export const dynamic = "force-dynamic";

export default async function PlatformCustomerAppDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await platformGetCustomerAppDetail(id);
  if (!detail) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <PlatformAdminSubheader
        title={detail.app.display_name || detail.app.slug}
        description="Initialize branding, review readiness, publish or suspend the customer API."
      />
      <PlatformCustomerAppDetail
        app={detail.app}
        orgName={detail.org?.name ?? "Salon"}
        initialDraft={detail.config.draft}
        checklist={detail.checklist}
        publishedAt={detail.config.publishedAt}
      />
    </div>
  );
}
