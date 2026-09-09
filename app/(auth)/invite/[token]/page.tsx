import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/features/auth/auth-shell";
import { AcceptInviteForm } from "@/components/features/auth/accept-invite-form";
import { getTeamInvitePreview } from "@/lib/actions/team";
import { buildPageMetadata } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";

type PageProps = {
  params: Promise<{ token: string }>;
};

export const metadata: Metadata = buildPageMetadata({
  title: "Accept team invite",
  description: `Join a ${SYNCOPS.name} salon team.`,
  path: "/invite",
  noIndex: true,
});

export default async function AcceptInvitePage({ params }: PageProps) {
  const { token: raw } = await params;
  const token = decodeURIComponent(raw);
  const preview = await getTeamInvitePreview(token);

  return (
    <AuthShell>
      {preview.ok ? (
        <AcceptInviteForm token={token} preview={preview} />
      ) : (
        <div className="auth-card border border-[var(--m-line)] bg-white/90 p-7 sm:p-8">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--m-ink)]">
            Invite unavailable
          </h2>
          <p className="mt-3 text-sm text-[var(--m-muted)]">{preview.error}</p>
          <p className="mt-6 text-sm">
            <Link
              href="/login"
              className="font-semibold text-[var(--m-accent)] underline-offset-4 hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      )}
    </AuthShell>
  );
}
