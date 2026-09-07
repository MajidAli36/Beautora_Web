"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { notify } from "@/lib/toast";
// import { AuthSocialButtons } from "@/components/features/auth/auth-social-buttons";
import {
  checkEmailAvailable,
  checkSalonNameAvailable,
  registerAccount,
} from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function SignupForm() {
  const router = useRouter();
  const [salonName, setSalonName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nameHint, setNameHint] = useState<string | null>(null);
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [nameOk, setNameOk] = useState<boolean | null>(null);
  const [emailOk, setEmailOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (salonName.trim().length < 2) {
      setNameOk(null);
      setNameHint(null);
      return;
    }
    const handle = window.setTimeout(async () => {
      const result = await checkSalonNameAvailable(salonName);
      setNameOk(result.available);
      setNameHint(result.available ? "Salon name is available" : result.error ?? null);
    }, 400);
    return () => window.clearTimeout(handle);
  }, [salonName]);

  useEffect(() => {
    const value = email.trim().toLowerCase();
    if (!value.includes("@")) {
      setEmailOk(null);
      setEmailHint(null);
      return;
    }
    const handle = window.setTimeout(async () => {
      const result = await checkEmailAvailable(value);
      setEmailOk(result.available);
      setEmailHint(result.available ? "Email is available" : result.error ?? null);
    }, 400);
    return () => window.clearTimeout(handle);
  }, [email]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedSalon = salonName.trim();

    if (password.length < 8) {
      notify.error("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    if (nameOk === false || emailOk === false) {
      const msg =
        nameOk === false
          ? nameHint ?? "Salon name is already taken"
          : emailHint ?? "Email is already in use";
      notify.error(msg);
      setLoading(false);
      return;
    }

    const created = await registerAccount({
      email: trimmedEmail,
      password,
      salonName: trimmedSalon,
    });

    if (created.error) {
      notify.error(created.error);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (signInError) {
      notify.error(signInError.message);
      setLoading(false);
      return;
    }

    notify.success("Account created — you’re signed in.");
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <div className="auth-card border border-[var(--m-line)] bg-white/90 p-7 sm:p-8">
      <div>
        <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-4xl">
          Sign up
        </h2>
        <p className="mt-2 text-sm text-[var(--m-muted)]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[var(--m-accent)] underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <label htmlFor="salonName" className="text-sm font-medium text-[var(--m-ink-soft)]">
            Salon / store name
          </label>
          <input
            id="salonName"
            type="text"
            placeholder="e.g. Glow Studio"
            value={salonName}
            onChange={(e) => setSalonName(e.target.value)}
            required
            autoComplete="organization"
            className={fieldClassName}
          />
          {nameHint && (
            <p
              className={cn(
                "text-xs",
                nameOk ? "text-[var(--m-accent)]" : "text-red-700"
              )}
            >
              {nameHint}
            </p>
          )}
          {!nameHint && (
            <p className="text-xs text-[var(--m-muted)]">
              Must be unique. You’ll fine-tune setup next.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-[var(--m-ink-soft)]">
            Work email
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
          {emailHint && (
            <p
              className={cn(
                "text-xs",
                emailOk ? "text-[var(--m-accent)]" : "text-red-700"
              )}
            >
              {emailHint}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-[var(--m-ink-soft)]">
            Password
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
          <p className="text-xs text-[var(--m-muted)]">At least 8 characters</p>
        </div>

        <button
          type="submit"
          disabled={loading || nameOk === false || emailOk === false}
          className="inline-flex h-12 w-full items-center justify-center gap-2 bg-[var(--m-ink)] text-sm font-semibold tracking-wide text-[var(--m-paper)] transition-colors hover:bg-[var(--m-ink-soft)] disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Continue to setup"}
          {!loading && <ArrowRight className="size-4" />}
        </button>
      </form>

      {/* Social login — enable later when OAuth providers are configured
      <div className="mt-7">
        <AuthSocialButtons />
      </div>
      */}
    </div>
  );
}

const fieldClassName =
  "h-12 w-full border border-[var(--m-line)] bg-white px-3.5 text-sm text-[var(--m-ink)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--m-muted)]/70 focus:border-[var(--m-accent)] focus:ring-4 focus:ring-[var(--m-accent)]/15";
