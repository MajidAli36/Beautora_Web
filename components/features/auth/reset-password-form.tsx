"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { notify } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      notify.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      notify.error("Passwords do not match");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      notify.error("Reset link expired or invalid. Request a new one from sign in.");
      setLoading(false);
      router.push("/login");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      notify.error(error.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    notify.success("Password updated");
    router.push("/login?reset=1");
    setLoading(false);
  }

  return (
    <div className="auth-card border border-[var(--m-line)] bg-white/90 p-7 sm:p-8">
      <div>
        <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-4xl">
          New password
        </h2>
        <p className="mt-2 text-sm text-[var(--m-muted)]">
          Choose a new password for your Beautora account.{" "}
          <Link
            href="/login"
            className="font-semibold text-[var(--m-accent)] underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-[var(--m-ink-soft)]">
            New password
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
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className={fieldClassName}
          />
          {confirmPassword.length > 0 && password !== confirmPassword ? (
            <p className="text-xs text-red-700">Passwords do not match</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={loading || (confirmPassword.length > 0 && password !== confirmPassword)}
          className="inline-flex h-12 w-full items-center justify-center gap-2 bg-[var(--m-ink)] text-sm font-semibold tracking-wide text-[var(--m-paper)] transition-colors hover:bg-[var(--m-ink-soft)] disabled:opacity-60"
        >
          {loading ? "Saving…" : "Update password"}
          {!loading && <ArrowRight className="size-4" />}
        </button>
      </form>
    </div>
  );
}

const fieldClassName =
  "h-12 w-full border border-[var(--m-line)] bg-white px-3.5 text-sm text-[var(--m-ink)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--m-muted)]/70 focus:border-[var(--m-accent)] focus:ring-4 focus:ring-[var(--m-accent)]/15";
