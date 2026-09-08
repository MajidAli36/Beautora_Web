"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { notify } from "@/lib/toast";
import {
  applyAsPartner,
  checkPartnerUsernameAvailable,
} from "@/lib/actions/partners";
import { createClient } from "@/lib/supabase/client";
import { SUBSCRIPTION } from "@/lib/billing/subscription";
import { cn } from "@/lib/utils";

const fieldClassName =
  "h-11 w-full rounded-none border border-[var(--m-line)] bg-white px-3 text-sm text-[var(--m-ink)] outline-none transition-colors placeholder:text-[var(--m-muted)] focus:border-[var(--m-ink)]";

export function PartnerApplyForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usernameOk, setUsernameOk] = useState<boolean | null>(null);
  const [usernameHint, setUsernameHint] = useState<string | null>(null);

  useEffect(() => {
    if (username.trim().length < 3) {
      setUsernameOk(null);
      setUsernameHint(null);
      return;
    }
    const handle = window.setTimeout(async () => {
      const result = await checkPartnerUsernameAvailable(username);
      setUsernameOk(result.available);
      setUsernameHint(
        result.available ? "Username is available" : result.error ?? null
      );
    }, 400);
    return () => window.clearTimeout(handle);
  }, [username]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (usernameOk === false) {
      notify.error(usernameHint ?? "Username is not available");
      return;
    }
    if (password.length < 8) {
      notify.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      notify.error("Password and confirm password do not match");
      return;
    }

    setLoading(true);
    const result = await applyAsPartner({
      email,
      password,
      username,
      fullName,
      phone,
    });

    if (result.error) {
      notify.error(result.error);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      notify.success("Application submitted — please sign in");
      router.push("/login");
      setLoading(false);
      return;
    }

    notify.success("Application submitted — waiting for SyncOps approval");
    window.location.assign("/partner/dashboard");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="partner-name" className="text-sm font-medium text-[var(--m-ink-soft)]">
          Full name
        </label>
        <input
          id="partner-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your name"
          className={fieldClassName}
          autoComplete="name"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="partner-username" className="text-sm font-medium text-[var(--m-ink-soft)]">
          Username <span className="text-[var(--m-muted)]">(referral code)</span>
        </label>
        <input
          id="partner-username"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          placeholder="e.g. ahmad_salon"
          required
          minLength={3}
          maxLength={32}
          pattern="[a-z0-9_]+"
          className={fieldClassName}
          autoComplete="username"
        />
        {usernameHint ? (
          <p
            className={cn(
              "text-xs",
              usernameOk ? "text-emerald-700" : "text-red-600"
            )}
          >
            {usernameHint}
          </p>
        ) : (
          <p className="text-xs text-[var(--m-muted)]">
            Clients open stores with{" "}
            <span className="font-medium text-[var(--m-ink)]">
              /signup?ref={username.trim() || "yourname"}
            </span>
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="partner-email" className="text-sm font-medium text-[var(--m-ink-soft)]">
          Email
        </label>
        <input
          id="partner-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          required
          autoComplete="email"
          className={fieldClassName}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="partner-phone" className="text-sm font-medium text-[var(--m-ink-soft)]">
          Phone <span className="text-[var(--m-muted)]">(optional)</span>
        </label>
        <input
          id="partner-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="03XX XXXXXXX"
          className={fieldClassName}
          autoComplete="tel"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="partner-password" className="text-sm font-medium text-[var(--m-ink-soft)]">
          Password
        </label>
        <div className="relative">
          <input
            id="partner-password"
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
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[var(--m-muted)]"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <p className="text-xs text-[var(--m-muted)]">At least 8 characters</p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="partner-confirm-password"
          className="text-sm font-medium text-[var(--m-ink-soft)]"
        >
          Confirm password
        </label>
        <div className="relative">
          <input
            id="partner-confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className={cn(fieldClassName, "pr-11")}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[var(--m-muted)]"
            onClick={() => setShowConfirmPassword((v) => !v)}
            aria-label={
              showConfirmPassword ? "Hide confirm password" : "Show confirm password"
            }
          >
            {showConfirmPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
        {confirmPassword.length > 0 && password !== confirmPassword ? (
          <p className="text-xs text-red-600">Passwords do not match</p>
        ) : null}
      </div>

      <p className="rounded-lg border border-[var(--m-line)] bg-[var(--m-paper)] px-3 py-2 text-xs leading-relaxed text-[var(--m-muted)]">
        When a salon you refer pays their first monthly subscription (
        {SUBSCRIPTION.currencyLabel} {SUBSCRIPTION.monthlyAmountPkr.toLocaleString("en-PK")}
        ), that full first payment is credited to you. Applications are reviewed by SyncOps
        before your referral link goes live.
      </p>

      <button
        type="submit"
        disabled={
          loading ||
          usernameOk === false ||
          (confirmPassword.length > 0 && password !== confirmPassword)
        }
        className="inline-flex h-11 w-full items-center justify-center gap-2 bg-[var(--m-ink)] text-sm font-semibold text-[var(--m-paper)] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Submitting…" : "Apply as partner"}
        <ArrowRight className="size-4" />
      </button>

      <p className="text-center text-sm text-[var(--m-muted)]">
        Already applied?{" "}
        <Link href="/login" className="font-semibold text-[var(--m-accent)] hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
