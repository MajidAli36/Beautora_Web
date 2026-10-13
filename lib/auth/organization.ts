import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { enterCurrencyFromCountry } from "@/lib/currency/runtime.server";
import type { MemberRole } from "@/types";

export type OrganizationMembership = {
  organizationId: string;
  organizationName: string;
  role: MemberRole;
  /** Store country from Settings / onboarding — drives display currency. */
  country: string | null;
};

export const getUserMemberships = cache(async (): Promise<OrganizationMembership[]> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("organization_members")
    .select(
      `
      role,
      organization:organizations (
        id,
        name,
        country
      )
    `
    )
    .eq("user_id", user.id);

  if (error) {
    // Soft-fail: layout depends on this — never 500 the whole app shell.
    console.error("[org] getUserMemberships failed", error.message);
    return [];
  }
  if (!data) return [];

  return data
    .filter((row) => row.organization)
    .map((row) => ({
      organizationId: row.organization!.id,
      organizationName: row.organization!.name,
      role: row.role as MemberRole,
      country: (row.organization as { country?: string | null }).country ?? null,
    }));
});

export const getActiveOrganization = cache(async (): Promise<OrganizationMembership | null> => {
  const memberships = await getUserMemberships();
  if (memberships.length === 0) return null;
  // Single-salon MVP: auto-select the first (only) organization.
  const org = memberships[0];
  enterCurrencyFromCountry(org.country);
  return org;
});

export const requireOrganization = cache(async (): Promise<OrganizationMembership> => {
  const org = await getActiveOrganization();
  if (!org) {
    throw new Error("No organization membership found");
  }
  enterCurrencyFromCountry(org.country);
  return org;
});
