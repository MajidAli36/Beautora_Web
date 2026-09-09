import type { Metadata } from "next";
import { AuthShell } from "@/components/features/auth/auth-shell";
import { ResetPasswordForm } from "@/components/features/auth/reset-password-form";
import { buildPageMetadata } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";

export const metadata: Metadata = buildPageMetadata({
  title: "Reset password",
  description: `Choose a new password for your ${SYNCOPS.name} account.`,
  path: "/reset-password",
  noIndex: true,
});

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <ResetPasswordForm />
    </AuthShell>
  );
}
