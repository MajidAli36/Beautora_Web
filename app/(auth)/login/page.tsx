import type { Metadata } from "next";
import { AuthShell } from "@/components/features/auth/auth-shell";
import { LoginForm } from "@/components/features/auth/login-form";
import { ensureHardcodedPlatformAdmin } from "@/lib/actions/platform-auth";
import { SYNCOPS } from "@/lib/print/syncops";

export const metadata: Metadata = {
  title: "Sign in",
  description: `Sign in to your ${SYNCOPS.name} salon dashboard — a ${SYNCOPS.builder.name} product.`,
};

export default async function LoginPage() {
  // Soft ensure only (no password reset) so page load doesn't race with sign-in
  await ensureHardcodedPlatformAdmin({ syncPassword: false });

  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
