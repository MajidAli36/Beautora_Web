"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { notify } from "@/lib/toast";
// import { AuthSocialButtons } from "@/components/features/auth/auth-social-buttons";
import { confirmUserEmail } from "@/lib/actions/auth";
import { ensureHardcodedPlatformAdmin } from "@/lib/actions/platform-auth";
import { PLATFORM_HARDCODED_ADMIN } from "@/lib/platform/admin";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

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
        // New Auth user — short wait before first password grant
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

    // Auto-confirm older accounts so "Email not confirmed" never blocks login.
    if (authError?.message?.toLowerCase().includes("email not confirmed")) {
      const confirmed = await confirmUserEmail(trimmedEmail);
      if (confirmed.error) {
        notify.error(confirmed.error);
        setLoading(false);
        return;
      }
      ({ error: authError } = await trySignIn());
    }

    // Admin first-login race: recreate/sync once and retry
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

    // Navigate directly — avoid post-login server actions on /login (middleware
    // used to redirect those POSTs and break the action protocol).
    // Store owners without an org are sent to /onboarding by middleware.
    window.location.assign(isPlatformAdmin ? "/platform" : "/dashboard");
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      notify.error("Enter your email above, then click Forgot password.");
      return;
    }
    setResetting(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      }
    );
    setResetting(false);
    if (resetError) {
      notify.error(resetError.message);
      return;
    }
    notify.success("Password reset email sent");
  }

  return (
    <div className="auth-card border border-[var(--m-line)] bg-white/90 p-7 sm:p-8">
      <div>
        <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-4xl">
          Sign in
        </h2>
        <p className="mt-2 text-sm text-[var(--m-muted)]">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-[var(--m-accent)] underline-offset-4 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-[var(--m-ink-soft)]">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@salon.com"
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
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className={cn(fieldClassName, "pr-10")}
            />
            <Lock className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-[var(--m-muted)]" />
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
      </form>

      {/* Social login — enable later when OAuth providers are configured
      <div className="mt-7">
        <AuthSocialButtons />
      </div>
      */}

      {/* Platform admin shortcut — keep hidden from UI; credentials in lib/platform/admin.ts
      <div className="mt-6 space-y-2 border-t border-[var(--m-line)] pt-5 text-xs text-[var(--m-muted)]">
        <p className="font-medium text-[var(--m-ink-soft)]">Platform admin (SyncOps)</p>
        <p>
          {PLATFORM_HARDCODED_ADMIN.email} / {PLATFORM_HARDCODED_ADMIN.password}
        </p>
        <button
          type="button"
          className="font-medium text-[var(--m-accent)] underline-offset-4 hover:underline"
          onClick={() => {
            setEmail(PLATFORM_HARDCODED_ADMIN.email);
            setPassword(PLATFORM_HARDCODED_ADMIN.password);
          }}
        >
          Fill admin login
        </button>
      </div>
      */}
    </div>
  );
}

const fieldClassName =
  "h-12 w-full border border-[var(--m-line)] bg-white px-3.5 text-sm text-[var(--m-ink)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--m-muted)]/70 focus:border-[var(--m-accent)] focus:ring-4 focus:ring-[var(--m-accent)]/15";
