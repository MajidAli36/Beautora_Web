import { requireAuth } from "@/lib/auth/session";
import { isPlatformAdminEmail } from "@/lib/billing/subscription";
import { ensureHardcodedPlatformAdmin } from "@/lib/actions/platform-auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platform admin",
  robots: { index: false, follow: false },
};

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureHardcodedPlatformAdmin({ syncPassword: false });
  const user = await requireAuth();
  if (!isPlatformAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      {children}
    </div>
  );
}
