import Link from "next/link";
import { AuthShell } from "@/components/features/auth/auth-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Intermediate step before verifyOtp.
 * Email clients / security scanners often prefetch links and burn one-time tokens;
 * requiring a real click here keeps the hash intact until the user continues.
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
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="font-display text-3xl tracking-tight text-[var(--m-ink)]">
            {valid ? "Confirm your email" : "Link invalid"}
          </h1>
          <p className="text-sm leading-relaxed text-[var(--m-ink)]/65">
            {valid
              ? "Click below to finish signing in. This protects your link from email scanners that open it automatically."
              : "This verification link is missing data. Request a new email from the sign-up page."}
          </p>
        </div>
        {valid ? (
          <Link href={href} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
            Continue
          </Link>
        ) : (
          <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
            Back to sign up
          </Link>
        )}
      </div>
    </AuthShell>
  );
}
