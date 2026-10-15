import { cache } from "react";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/auth/organization";

export type LinkedStaffProfile = {
  id: string;
  fullName: string;
  email: string | null;
  jobTitle: string | null;
};

/**
 * Resolve the salon staff profile for the signed-in user.
 * Match by member_id when set, otherwise by email (same rule as Staff hub logins).
 * Cached once per request — member + email lookups run in parallel (one RTT).
 */
export const getLinkedStaffProfile = cache(
  async (): Promise<LinkedStaffProfile | null> => {
    const org = await getActiveOrganization();
    if (!org) return null;

    const user = await getSession();
    if (!user) return null;

    const supabase = await createClient();
    const email = user.email?.trim().toLowerCase() ?? "";

    const [byMemberRes, byEmailRes] = await Promise.all([
      supabase
        .from("staff")
        .select("id, full_name, email, job_title")
        .eq("organization_id", org.organizationId)
        .eq("member_id", user.id)
        .is("deleted_at", null)
        .maybeSingle(),
      email
        ? supabase
            .from("staff")
            .select("id, full_name, email, job_title")
            .eq("organization_id", org.organizationId)
            .ilike("email", email)
            .is("deleted_at", null)
            .eq("is_active", true)
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const hit = byMemberRes.data ?? byEmailRes.data;
    if (!hit) return null;

    return {
      id: hit.id,
      fullName: hit.full_name,
      email: hit.email,
      jobTitle: hit.job_title,
    };
  }
);

export function isOwnStaffDashboardPath(
  pathname: string,
  staffId: string | null | undefined
): boolean {
  if (!staffId || !pathname) return false;
  return pathname === `/staff/${staffId}` || pathname.startsWith(`/staff/${staffId}/`);
}
