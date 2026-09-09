"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { notify } from "@/lib/toast";
import { confirmUserEmail, requestPasswordReset } from "@/lib/actions/auth";
import { ensureHardcodedPlatformAdmin } from "@/lib/actions/platform-auth";
import { PLATFORM_HARDCODED_ADMIN } from "@/lib/platform/admin";
import { createClient } from "@/lib/supabase/client";
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

  useEffect(() => {
    const preset = searchParams.get("email");
    if (preset) setEmail(preset);
    if (searchParams.get("verified") === "pending") {
      notify.success("Check your inbox for the Beautora verification link.");
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
      notify.error(
        "Please verify your email first — open the link we sent from Beautora."
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
    const dest = await resolvePostLoginDestination();
    // Soft navigate — avoid full browser reload flash after login
    router.replace(dest);
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
          {" · "}
          <Link
            href="/partner"
            className="font-semibold text-[var(--m-accent)] underline-offset-4 hover:underline"
          >
            Partner program
          </Link>
        </p>
        <p className="mt-2 text-xs text-[var(--m-muted)]">
          Partners land on the partner dashboard only — not the salon app.
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
      </form>
    </div>
  );
}

const fieldClassName =
  "h-12 w-full border border-[var(--m-line)] bg-white px-3.5 text-sm text-[var(--m-ink)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--m-muted)]/70 focus:border-[var(--m-accent)] focus:ring-4 focus:ring-[var(--m-accent)]/15";
