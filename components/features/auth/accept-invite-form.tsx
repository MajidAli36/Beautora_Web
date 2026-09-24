"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { acceptTeamInvite } from "@/lib/actions/team";
import type { InvitePreview } from "@/lib/actions/team";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

type Props = {
  token: string;
  preview: Extract<InvitePreview, { ok: true }>;
};

export function AcceptInviteForm({ token, preview }: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (preview.needsPassword) {
      if (password.length < 8) {
        notify.error("Password must be at least 8 characters");
        return;
      }
      if (password !== confirmPassword) {
        notify.error("Passwords do not match");
        return;
      }
    }

    setLoading(true);
    const result = await acceptTeamInvite({
      token,
      password: preview.needsPassword ? password : undefined,
      fullName: fullName.trim() || undefined,
    });

    if (result.error) {
      notify.error(result.error);
      setLoading(false);
      return;
    }

    notify.success("Invite accepted — sign in with your email and password.");
    router.push(`/login?email=${encodeURIComponent(preview.email)}`);
    setLoading(false);
  }

  return (
    <div className="auth-card border border-[var(--m-line)] bg-white/90 p-4 sm:p-7 lg:p-8">
      <div>
        <h2 className="font-display text-[1.65rem] font-semibold tracking-tight text-[var(--m-ink)] sm:text-3xl lg:text-4xl">
          Join {preview.salonName}
        </h2>
        <p className="mt-2 text-sm text-[var(--m-muted)]">
          You’re invited as <strong className="text-[var(--m-ink)]">{preview.roleLabel}</strong>{" "}
          ({preview.email}).{" "}
          <Link
            href="/login"
            className="font-semibold text-[var(--m-accent)] underline-offset-4 hover:underline"
          >
            Already have access? Sign in
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <label htmlFor="fullName" className="text-sm font-medium text-[var(--m-ink-soft)]">
            Your name (optional)
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            className={cn(
              "flex h-11 w-full rounded-xl border border-[var(--m-line)] bg-white px-3.5 text-base sm:text-sm",
              "text-[var(--m-ink)] outline-none focus-visible:border-[var(--m-accent)]"
            )}
          />
        </div>

        {preview.needsPassword ? (
          <>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-[var(--m-ink-soft)]">
                Create password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={cn(
                    "flex h-11 w-full rounded-xl border border-[var(--m-line)] bg-white px-3.5 pr-11 text-base sm:text-sm",
                    "text-[var(--m-ink)] outline-none focus-visible:border-[var(--m-accent)]"
                  )}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center px-3 text-[var(--m-muted)]"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-[var(--m-ink-soft)]"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className={cn(
                  "flex h-11 w-full rounded-xl border border-[var(--m-line)] bg-white px-3.5 text-base sm:text-sm",
                  "text-[var(--m-ink)] outline-none focus-visible:border-[var(--m-accent)]"
                )}
              />
            </div>
          </>
        ) : (
          <p className="rounded-xl border border-[var(--m-line)] bg-[var(--m-wash)] px-3.5 py-3 text-sm text-[var(--m-muted)]">
            This email already has a Beautora staff login. Accepting adds you to{" "}
            <strong className="text-[var(--m-ink)]">{preview.salonName}</strong> with your existing
            password.
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className={cn(
            "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl",
            "bg-[var(--m-ink)] text-sm font-semibold text-white transition hover:opacity-95",
            "disabled:opacity-60"
          )}
        >
          {loading ? "Accepting…" : "Accept invite"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
