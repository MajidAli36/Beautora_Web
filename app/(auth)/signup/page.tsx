import type { Metadata } from "next";
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
      <SignupForm />
    </AuthShell>
  );
}
