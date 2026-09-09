import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/features/auth/auth-shell";
import { LoginForm } from "@/components/features/auth/login-form";
import { ensureHardcodedPlatformAdmin } from "@/lib/actions/platform-auth";
import { buildPageMetadata } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";

export const metadata: Metadata = buildPageMetadata({
  title: "Sign in",
  description: `Sign in to your ${SYNCOPS.name} salon dashboard — a ${SYNCOPS.builder.name} product.`,
  path: "/login",
  noIndex: true,
});

export default async function LoginPage() {
  await ensureHardcodedPlatformAdmin({ syncPassword: false });

  return (
    <AuthShell>
      <Suspense
        fallback={
          <div className="auth-card min-h-[360px] border border-[var(--m-line)] bg-white/90 p-7 sm:p-8" />
        }
      >
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
