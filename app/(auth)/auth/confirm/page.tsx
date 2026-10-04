import Link from "next/link";
import { AuthShell } from "@/components/features/auth/auth-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Intermediate step before verifyOtp.
 * Lives under (auth) so marketing theme fonts/CSS variables apply (same as login/signup).
 * Email scanners that prefetch the link do not burn the token until Continue is clicked.
 */
export default async function AuthConfirmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tokenHash = typeof params.token_hash === "string" ? params.token_hash : "";
  const type = typeof params.type === "string" ? params.type : "";
  const next = typeof params.next === "string" ? params.next : "/onboarding";

  const callback = new URLSearchParams();
  if (tokenHash) callback.set("token_hash", tokenHash);
  if (type) callback.set("type", type);
  if (next) callback.set("next", next);
  const href = `/auth/callback?${callback.toString()}`;

  const valid = Boolean(tokenHash && type);

  return (
    <AuthShell>
      <div className="auth-card border border-[var(--m-line)] bg-white/90 p-4 sm:p-7 lg:p-8">
        <div className="space-y-2">
          <h1 className="font-display text-[1.65rem] font-semibold tracking-tight text-[var(--m-ink)] sm:text-3xl">
            {valid ? "Confirm your email" : "Link invalid"}
          </h1>
          <p className="text-sm leading-relaxed text-[var(--m-muted)]">
            {valid
              ? "Click below to finish signing in. This protects your link from email scanners that open it automatically."
              : "This verification link is missing data. Request a new email from the sign-up page."}
          </p>
        </div>
        <div className="mt-6">
          {valid ? (
            <Link
              href={href}
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-12 w-full bg-[var(--m-ink)] text-[var(--m-paper)] hover:bg-[var(--m-ink-soft)]"
              )}
            >
              Continue
            </Link>
          ) : (
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-12 w-full bg-[var(--m-ink)] text-[var(--m-paper)] hover:bg-[var(--m-ink-soft)]"
              )}
            >
              Back to sign up
            </Link>
          )}
        </div>
      </div>
    </AuthShell>
  );
}
