"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { notify } from "@/lib/toast";
import {
  confirmUserEmail,
  requestPasswordReset,
  resendSignupVerificationEmail,
} from "@/lib/actions/auth";
import { ensureHardcodedPlatformAdmin } from "@/lib/actions/platform-auth";
import { PLATFORM_HARDCODED_ADMIN } from "@/lib/platform/admin";
import { createClient } from "@/lib/supabase/client";
import { PartnerAwareSignupLink } from "@/components/partners/partner-aware-signup-link";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const preset = searchParams.get("email");
    if (preset) setEmail(preset);
    if (searchParams.get("verified") === "pending") {
      notify.success("Check your inbox for the Beautora verification link.");
    }
    if (searchParams.get("ready") === "1") {
      notify.success("Account ready — sign in with your password.");
    }
    if (searchParams.get("reset") === "1") {
      notify.success("Password updated — sign in with your new password.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const trimmedEmail = email.trim().toLowerCase();
    const isPlatformAdmin =
      trimmedEmail === PLATFORM_HARDCODED_ADMIN.email.toLowerCase();
    const supabase = createClient();

    // Ensure admin auth user exists + password is synced right before sign-in
    if (isPlatformAdmin) {
      const ensured = await ensureHardcodedPlatformAdmin({ syncPassword: true });
      if (!ensured.ok) {
        notify.error(ensured.error ?? "Could not prepare platform admin account");
        setLoading(false);
        return;
      }
      if (ensured.created) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    async function trySignIn() {
      return supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
    }

    let { error: authError } = await trySignIn();

    // Platform admin only — auto-confirm so hardcoded admin never blocks
    if (
      isPlatformAdmin &&
      authError?.message?.toLowerCase().includes("email not confirmed")
    ) {
      const confirmed = await confirmUserEmail(trimmedEmail);
      if (confirmed.error) {
        notify.error(confirmed.error);
        setLoading(false);
        return;
      }
      ({ error: authError } = await trySignIn());
    }

    if (authError?.message?.toLowerCase().includes("email not confirmed")) {
      setNeedsVerification(true);
      notify.error(
        "Please verify your email first — open the link we sent, or resend it below."
      );
      setLoading(false);
      return;
    }

    if (
      authError &&
      isPlatformAdmin &&
      /invalid login|invalid credentials|email not confirmed/i.test(authError.message)
    ) {
      await ensureHardcodedPlatformAdmin({ syncPassword: true });
      await new Promise((r) => setTimeout(r, 500));
      ({ error: authError } = await trySignIn());
    }

    if (authError) {
      notify.error(authError.message);
      setLoading(false);
      return;
    }

    notify.success("Signed in successfully");

    const { resolvePostLoginDestination } = await import("@/lib/actions/partners");
    const { safeAuthRedirect } = await import("@/lib/auth/account-types");
    const dest = await resolvePostLoginDestination();
    const redirectParam = searchParams.get("redirect");

    let next = dest;
    if (dest === "/shop") {
      next = safeAuthRedirect(redirectParam, "/shop");
    } else if (
      redirectParam &&
      dest !== "/onboarding" &&
      dest !== "/partner/dashboard" &&
      dest !== "/platform"
    ) {
      next = safeAuthRedirect(redirectParam, dest);
    }

    router.replace(next);
    router.refresh();
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      notify.error("Enter your email above, then click Forgot password.");
      return;
    }
    setResetting(true);
    const result = await requestPasswordReset(email.trim().toLowerCase());
    setResetting(false);
    if (result.error) {
      notify.error(result.error);
      return;
    }
    notify.success(
      "If an account exists for that email, password reset instructions were sent."
    );
  }

  async function handleResendVerification() {
    if (!email.trim() || password.length < 8) {
      notify.error("Enter your signup email and password, then resend.");
      return;
    }
    setResending(true);
    const result = await resendSignupVerificationEmail({
      email: email.trim().toLowerCase(),
      password,
    });
    setResending(false);
    if (result.error) {
      notify.error(result.error);
      return;
    }
    setNeedsVerification(true);
    notify.success("New verification email sent — open the newest message.");
  }

  return (
    <div className="auth-card border border-[var(--m-line)] bg-white/90 p-4 sm:p-7 lg:p-8">
      <div>
        <h2 className="font-display text-[1.65rem] font-semibold tracking-tight text-[var(--m-ink)] sm:text-3xl lg:text-4xl">
          Sign in
        </h2>
        <p className="mt-1.5 text-sm text-[var(--m-muted)] sm:mt-2">
          Don&apos;t have an account?{" "}
          <PartnerAwareSignupLink className="font-semibold text-[var(--m-accent)] underline-offset-4 hover:underline">
            Sign up
          </PartnerAwareSignupLink>
        </p>
        <div className="mt-3 border border-[var(--m-line)] bg-white px-3 py-2.5">
          <Link
            href="/partner"
            className="text-sm font-semibold text-[var(--m-accent)] underline-offset-4 hover:underline"
          >
            Partner program
          </Link>
          <p className="mt-0.5 text-xs leading-snug text-[var(--m-muted)]">
            Earn by referring salons — opens the partner dashboard
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4 sm:mt-7 sm:space-y-5">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-[var(--m-ink-soft)]">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className={fieldClassName}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="password" className="text-sm font-medium text-[var(--m-ink-soft)]">
              Password
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetting}
              className="text-sm font-medium text-[var(--m-accent)] underline-offset-4 hover:underline disabled:opacity-60"
            >
              {resetting ? "Sending…" : "Forgot password"}
            </button>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className={cn(fieldClassName, "pr-11")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute top-1/2 right-2.5 flex size-8 -translate-y-1/2 items-center justify-center text-[var(--m-muted)] transition-colors hover:text-[var(--m-ink)]"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="size-4 accent-[var(--m-ink)]"
          />
          <span className="text-sm text-[var(--m-muted)]">Remember me</span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-12 w-full items-center justify-center gap-2 bg-[var(--m-ink)] text-sm font-semibold tracking-wide text-[var(--m-paper)] transition-colors hover:bg-[var(--m-ink-soft)] disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Login"}
          {!loading && <ArrowRight className="size-4" />}
        </button>

        {needsVerification ? (
          <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
            <p className="text-xs leading-relaxed text-amber-950">
              This account is waiting for email verification. Open the newest Beautora
              email, or resend a fresh link.
            </p>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resending}
              className="text-sm font-semibold text-[var(--m-accent)] underline-offset-4 hover:underline disabled:opacity-60"
            >
              {resending ? "Sending…" : "Resend verification email"}
            </button>
          </div>
        ) : null}
      </form>
    </div>
  );
}

const fieldClassName =
  "h-11 w-full border border-[var(--m-line)] bg-white px-3.5 text-base text-[var(--m-ink)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--m-muted)]/70 focus:border-[var(--m-accent)] focus:ring-4 focus:ring-[var(--m-accent)]/15 sm:h-12 sm:text-sm";
