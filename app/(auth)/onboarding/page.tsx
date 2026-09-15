import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/features/auth/auth-shell";
import { OrganizationOnboarding } from "@/components/features/onboarding/organization-onboarding";
import { getActiveOrganization } from "@/lib/auth/organization";
import { requireAuth } from "@/lib/auth/session";
import { buildPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Quick start",
  description:
    "Choose Marketplace, Salon POS, or Both — then name your salon and open Beautora.",
  path: "/onboarding",
  noIndex: true,
});

export default async function OnboardingPage() {
  const user = await requireAuth();
  const org = await getActiveOrganization();
  if (org) {
    redirect("/dashboard");
  }

  const initialSalonName =
    typeof user.user_metadata?.salon_name === "string"
      ? user.user_metadata.salon_name
      : "";

  return (
    <AuthShell slide={2}>
      <OrganizationOnboarding
        initialSalonName={initialSalonName}
        userEmail={user.email ?? undefined}
      />
    </AuthShell>
  );
}
