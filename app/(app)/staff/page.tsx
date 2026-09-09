import { PageHeader } from "@/components/layout/page-header";
import { getStaff } from "@/lib/actions/staff";
import {
  getTeamMembers,
  getPendingTeamInvitations,
  canManageTeam,
} from "@/lib/actions/team";
import { getRolePermissionMatrix } from "@/lib/actions/role-permissions";
import { getCapabilities } from "@/lib/auth/permissions";
import { StaffHub } from "@/components/features/staff/staff-hub";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/env";

export default async function StaffPage() {
  const [staffList, staffCaps, canTeam] = await Promise.all([
    getStaff(),
    getCapabilities("staff"),
    canManageTeam(),
  ]);

  const canManage = staffCaps.canManage;
  const teamMembers = canTeam ? await getTeamMembers().catch(() => []) : [];
  const invitations = canTeam
    ? await getPendingTeamInvitations().catch(() => [])
    : [];
  const canManagePermissions = await import("@/lib/auth/permissions").then((m) =>
    m.checkAction("staff.manage_permissions")
  );
  const roleMatrix = canManagePermissions
    ? await getRolePermissionMatrix().catch(() => [])
    : [];
  const canInvite = Boolean(getSupabaseServiceRoleKey()) && canTeam;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description="Manage salon profiles, app logins, and role-based sidebar access in one place."
      />

      <StaffHub
        staffList={staffList}
        teamMembers={teamMembers}
        invitations={invitations}
        roleMatrix={roleMatrix}
        canManage={canManage}
        canTeam={canTeam}
        canInvite={canInvite}
        canConfigureRoles={canManagePermissions}
      />
    </div>
  );
}
