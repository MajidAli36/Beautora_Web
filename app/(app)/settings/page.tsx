import { PageHeader } from "@/components/layout/page-header";
import { getAuditLogs, getDeletedRecords } from "@/lib/actions/audit";
import { getStoreProfile } from "@/lib/actions/store-profile";
import { getActiveOrganization } from "@/lib/auth/organization";
import { canManageRecords } from "@/lib/auth/permissions";
import { ROLE_LABELS } from "@/lib/permissions/roles";
import { SettingsTabs } from "@/components/features/settings/settings-tabs";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const org = await getActiveOrganization();
  if (!org) redirect("/onboarding");

  const profile = await getStoreProfile();
  if (!profile) redirect("/onboarding");

  const canManage = await canManageRecords();
  const [auditLogs, deletedRecords] = canManage
    ? await Promise.all([
        getAuditLogs(200).catch(() => []),
        getDeletedRecords().catch(() => []),
      ])
    : [[], []];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Settings"
        description="Store profile, hours, and payment accounts used on online booking — plus system tools."
      />

      <SettingsTabs
        profile={profile}
        canManage={canManage}
        auditLogs={auditLogs}
        deletedRecords={deletedRecords}
        roleLabel={ROLE_LABELS[org.role]}
      />
    </div>
  );
}
