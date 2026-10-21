import { PageHeader } from "@/components/layout/page-header";
import { getAuditLogs, getDeletedRecords } from "@/lib/actions/audit";
import { getStoreProfile } from "@/lib/actions/store-profile";
import { getAttendancePolicy } from "@/lib/actions/staff-fines";
import { getActiveOrganization } from "@/lib/auth/organization";
import { canManageRecords } from "@/lib/auth/permissions";
import { ROLE_LABELS } from "@/lib/permissions/roles";
import { SettingsTabs } from "@/components/features/settings/settings-tabs";
import { StorePublicListingToggle } from "@/components/features/settings/store-public-listing-toggle";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const org = await getActiveOrganization();
  if (!org) redirect("/onboarding");

  const profile = await getStoreProfile();
  if (!profile) redirect("/onboarding");

  const canManage = await canManageRecords();
  const [auditLogs, deletedRecords, attendancePolicy] = await Promise.all([
    canManage ? getAuditLogs(200).catch(() => []) : Promise.resolve([]),
    canManage ? getDeletedRecords().catch(() => []) : Promise.resolve([]),
    getAttendancePolicy().catch(() => ({
      late_grace_minutes: 15,
      late_allowed_days_per_month: 3,
      late_fine_amount: 0,
      default_duty_start: "10:00",
      default_duty_end: "20:00",
    })),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Settings"
        description="Store profile, hours, attendance/late policy, and payment accounts — plus system tools."
        actions={
          <StorePublicListingToggle
            enabled={profile.public_listing_enabled}
            canManage={canManage}
          />
        }
      />

      <SettingsTabs
        profile={profile}
        canManage={canManage}
        auditLogs={auditLogs}
        deletedRecords={deletedRecords}
        roleLabel={ROLE_LABELS[org.role]}
        attendancePolicy={attendancePolicy}
      />
    </div>
  );
}
