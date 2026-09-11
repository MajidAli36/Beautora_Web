import { createClient } from "@/lib/supabase/server";
import { requireOrganization } from "@/lib/auth/organization";

export type LinkedStaffProfile = {
  id: string;
  fullName: string;
  email: string | null;
  jobTitle: string | null;
};

/**
 * Resolve the salon staff profile for the signed-in user.
 * Match by member_id when set, otherwise by email (same rule as Staff hub logins).
 */
export async function getLinkedStaffProfile(): Promise<LinkedStaffProfile | null> {
  const org = await requireOrganization();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const email = user.email?.trim().toLowerCase() ?? "";

  const { data: byMember } = await supabase
    .from("staff")
    .select("id, full_name, email, job_title")
    .eq("organization_id", org.organizationId)
    .eq("member_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (byMember) {
    return {
      id: byMember.id,
      fullName: byMember.full_name,
      email: byMember.email,
      jobTitle: byMember.job_title,
    };
  }

  if (!email) return null;

  const { data: byEmail } = await supabase
    .from("staff")
    .select("id, full_name, email, job_title")
    .eq("organization_id", org.organizationId)
    .ilike("email", email)
    .is("deleted_at", null)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!byEmail) return null;

  return {
    id: byEmail.id,
    fullName: byEmail.full_name,
    email: byEmail.email,
    jobTitle: byEmail.job_title,
  };
}

export function isOwnStaffDashboardPath(
  pathname: string,
  staffId: string | null | undefined
): boolean {
  if (!staffId || !pathname) return false;
  return pathname === `/staff/${staffId}` || pathname.startsWith(`/staff/${staffId}/`);
}
