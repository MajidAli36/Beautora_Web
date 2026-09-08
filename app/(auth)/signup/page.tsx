import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/features/auth/auth-shell";
import { SignupForm } from "@/components/features/auth/signup-form";

export const metadata: Metadata = {
  title: "Open a store",
  description:
    "Create your Beautora salon account — POS, booking, and staff tools by SyncOps. First month free.",
};

export default function SignupPage() {
  return (
    <AuthShell slide={1}>
      <Suspense fallback={<div className="auth-card min-h-[420px] border border-[var(--m-line)] bg-white/90 p-7 sm:p-8" />}>
        <SignupForm />
      </Suspense>
    </AuthShell>
  );
}
