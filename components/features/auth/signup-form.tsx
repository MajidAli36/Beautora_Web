"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, ShoppingBag, Store } from "lucide-react";
import { notify } from "@/lib/toast";
import {
  checkEmailAvailable,
  checkSalonNameAvailable,
  registerAccount,
  resendSignupVerificationEmail,
} from "@/lib/actions/auth";
import { rememberPartnerReferral, getRememberedPartnerReferral } from "@/lib/actions/partners";
import {
  PARTNER_REF_STORAGE_KEY,
  validatePartnerUsername,
} from "@/lib/partners/referral";
import type { SignupAccountType } from "@/lib/auth/account-types";
import { cn } from "@/lib/utils";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accountType, setAccountType] = useState<SignupAccountType>("owner");
  const [salonName, setSalonName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nameHint, setNameHint] = useState<string | null>(null);
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [nameOk, setNameOk] = useState<boolean | null>(null);
  const [emailOk, setEmailOk] = useState<boolean | null>(null);
  const [partnerRef, setPartnerRef] = useState<string | null>(null);
  const [refHint, setRefHint] = useState<string | null>(null);
  const [phase, setPhase] = useState<"form" | "verify">("form");
  const [resending, setResending] = useState(false);

  const isOwner = accountType === "owner";
  const isCustomer = accountType === "customer";

  useEffect(() => {
    const intent = searchParams.get("as");
    if (intent === "customer" || intent === "shopper" || intent === "user") {
      setAccountType("customer");
    } else if (intent === "owner" || intent === "salon") {
      setAccountType("owner");
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function hydratePartnerRef() {
      const urlRef = searchParams.get("ref")?.trim() ?? null;
      let stored: string | null = null;
      try {
        const raw = window.localStorage.getItem(PARTNER_REF_STORAGE_KEY);
        if (raw) {
          const validated = validatePartnerUsername(raw);
          stored = validated.ok ? validated.username : null;
        }
      } catch {
        /* ignore */
      }

      const candidate = urlRef || stored;
      if (candidate) {
        const result = await rememberPartnerReferral(candidate);
        if (cancelled) return;
        if (result.error) {
          // Only show error when they landed with an explicit bad ?ref=
          if (urlRef) {
            setPartnerRef(null);
            setRefHint(result.error);
          } else {
            // Stale localStorage — clear and fall through to cookie
            try {
              window.localStorage.removeItem(PARTNER_REF_STORAGE_KEY);
            } catch {
              /* ignore */
            }
            const remembered = await getRememberedPartnerReferral();
            if (!cancelled && remembered) {
              setPartnerRef(remembered);
              setRefHint(null);
            }
          }
          return;
        }
        const username = result.username ?? candidate.toLowerCase();
        try {
          window.localStorage.setItem(PARTNER_REF_STORAGE_KEY, username);
        } catch {
          /* ignore */
        }
        setPartnerRef(username);
        setRefHint(null);
        return;
      }

      const remembered = await getRememberedPartnerReferral();
      if (cancelled) return;
      if (remembered) {
        try {
          window.localStorage.setItem(PARTNER_REF_STORAGE_KEY, remembered);
        } catch {
          /* ignore */
        }
        setPartnerRef(remembered);
        setRefHint(null);
      }
    }

    void hydratePartnerRef();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  useEffect(() => {
    if (!isOwner) {
      setNameOk(null);
      setNameHint(null);
      return;
    }
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
  }, [salonName, isOwner]);

  useEffect(() => {
    const value = email.trim().toLowerCase();
    if (!value.includes("@")) {
      setEmailOk(null);
      setEmailHint(null);
      return;
    }
    const handle = window.setTimeout(async () => {
      const result = await checkEmailAvailable(
        value,
        isCustomer ? "customer_signup" : "salon_signup"
      );
      setEmailOk(result.available);
      setEmailHint(result.available ? "Email is available" : result.error ?? null);
    }, 400);
    return () => window.clearTimeout(handle);
  }, [email, isCustomer]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedSalon = salonName.trim();
    const trimmedName = fullName.trim();

    if (password.length < 8) {
      notify.error("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      notify.error("Password and confirm password do not match");
      setLoading(false);
      return;
    }

    if (isOwner && nameOk === false) {
      notify.error(nameHint ?? "Salon name is already taken");
      setLoading(false);
      return;
    }

    if (emailOk === false) {
      notify.error(emailHint ?? "Email is already in use");
      setLoading(false);
      return;
    }

    const created = await registerAccount({
      email: trimmedEmail,
      password,
      accountType,
      salonName: isOwner ? trimmedSalon : undefined,
      fullName: isCustomer ? trimmedName : undefined,
      referralCode: isOwner ? partnerRef : null,
    });

    if (created.error) {
      notify.error(created.error);
      setLoading(false);
      return;
    }

    if (created.needsEmailVerification) {
      notify.success(
        isCustomer
          ? "Account created — check your email to verify, then shop and add to cart."
          : "Account created — check your email to verify and finish onboarding."
      );
      setPhase("verify");
      setLoading(false);
      return;
    }

    notify.success("Account ready — sign in with your password.");
    router.push(
      `/login?email=${encodeURIComponent(trimmedEmail)}&ready=1`
    );
    setLoading(false);
  }

  async function handleResendVerification() {
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
    notify.success("New verification email sent — open the newest message.");
  }

  if (phase === "verify") {
    return (
      <div className="auth-card border border-[var(--m-line)] bg-white/90 p-4 sm:p-7 lg:p-8">
        <div className="space-y-3">
          <h2 className="font-display text-[1.65rem] font-semibold tracking-tight text-[var(--m-ink)] sm:text-3xl">
            Check your email
          </h2>
          <p className="text-sm leading-relaxed text-[var(--m-muted)]">
            We sent a verification link to{" "}
            <span className="font-semibold text-[var(--m-ink)]">
              {email.trim().toLowerCase()}
            </span>
            . Open it, then click <strong>Continue</strong> on the confirmation page.
          </p>
          <p className="text-xs leading-relaxed text-[var(--m-muted)]">
            Old links stop working after a new email is sent. Use the newest message only.
          </p>
        </div>
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resending}
            className="inline-flex h-12 w-full items-center justify-center gap-2 border border-[var(--m-ink)] bg-white text-sm font-semibold text-[var(--m-ink)] transition-colors hover:bg-[var(--m-mist)] disabled:opacity-60"
          >
            {resending ? "Sending…" : "Resend verification email"}
          </button>
          <Link
            href={`/login?email=${encodeURIComponent(email.trim().toLowerCase())}`}
            className="inline-flex h-12 w-full items-center justify-center gap-2 bg-[var(--m-ink)] text-sm font-semibold text-[var(--m-paper)] transition-colors hover:bg-[var(--m-ink-soft)]"
          >
            I verified — go to sign in
            <ArrowRight className="size-4" />
          </Link>
          <button
            type="button"
            onClick={() => setPhase("form")}
            className="w-full text-sm font-medium text-[var(--m-accent)] underline-offset-4 hover:underline"
          >
            Back to sign up form
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card border border-[var(--m-line)] bg-white/90 p-4 sm:p-7 lg:p-8">
      <div>
        <h2 className="font-display text-[1.65rem] font-semibold tracking-tight text-[var(--m-ink)] sm:text-3xl lg:text-4xl">
          Sign up
        </h2>
        <p className="mt-1.5 text-sm text-[var(--m-muted)] sm:mt-2">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[var(--m-accent)] underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--m-muted)] sm:mt-3">
          First tell us why you&apos;re here — we only ask for the fields that match your path.
        </p>
        {isOwner && partnerRef ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            Referred by partner <span className="font-semibold">@{partnerRef}</span> — they
            earn your first month&apos;s subscription when you pay.
          </p>
        ) : null}
        {isOwner && refHint ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            {refHint}. You can still open a store without a partner referral.
          </p>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 sm:mt-7 sm:space-y-5">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-[var(--m-ink-soft)]">
            Why are you joining Beautora?
          </legend>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => setAccountType("customer")}
              className={cn(
                "flex min-h-[3.25rem] items-start gap-2.5 border px-3 py-2.5 text-left transition-colors sm:gap-3 sm:py-3",
                isCustomer
                  ? "border-[var(--m-ink)] bg-[var(--m-mist)]"
                  : "border-[var(--m-line)] hover:border-[var(--m-accent)]/50"
              )}
            >
              <ShoppingBag className="mt-0.5 size-4 shrink-0 text-[var(--m-accent)]" />
              <span>
                <span className="block text-sm font-semibold text-[var(--m-ink)]">
                  I want to shop
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-[var(--m-muted)]">
                  Marketplace buyer — sign in to add to cart &amp; COD checkout
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setAccountType("owner")}
              className={cn(
                "flex min-h-[3.25rem] w-full items-start gap-2.5 border px-3 py-2.5 text-left transition-colors sm:gap-3 sm:py-3",
                isOwner
                  ? "border-[var(--m-ink)] bg-[var(--m-mist)]"
                  : "border-[var(--m-line)] hover:border-[var(--m-accent)]/50"
              )}
            >
              <Store className="mt-0.5 size-4 shrink-0 text-[var(--m-accent)]" />
              <span>
                <span className="block text-sm font-semibold text-[var(--m-ink)]">
                  I run a salon / shop
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-[var(--m-muted)]">
                  Owner — after email verify, pick Marketplace, Salon POS, or Both
                </span>
              </span>
            </button>
          </div>
        </fieldset>

        {isOwner ? (
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
                Must be unique. You&apos;ll choose Marketplace, Salon POS, or Both next.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <label htmlFor="fullName" className="text-sm font-medium text-[var(--m-ink-soft)]">
              Your name
            </label>
            <input
              id="fullName"
              type="text"
              placeholder="e.g. Sara Ahmed"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              className={fieldClassName}
            />
            <p className="text-xs text-[var(--m-muted)]">
              Optional — used on Marketplace orders after you sign in.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-[var(--m-ink-soft)]">
            {isOwner ? "Work email" : "Email"}
          </label>
          <input
            id="email"
            type="email"
            placeholder={isOwner ? "you@salon.com" : "you@email.com"}
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

        <div className="space-y-2">
          <label
            htmlFor="confirmPassword"
            className="text-sm font-medium text-[var(--m-ink-soft)]"
          >
            Confirm password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
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
              onClick={() => setShowConfirmPassword((v) => !v)}
              aria-label={
                showConfirmPassword ? "Hide confirm password" : "Show confirm password"
              }
              className="absolute top-1/2 right-2.5 flex size-8 -translate-y-1/2 items-center justify-center text-[var(--m-muted)] transition-colors hover:text-[var(--m-ink)]"
            >
              {showConfirmPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {confirmPassword.length > 0 && password !== confirmPassword ? (
            <p className="text-xs text-red-700">Passwords do not match</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={
            loading ||
            (isOwner && nameOk === false) ||
            emailOk === false ||
            (confirmPassword.length > 0 && password !== confirmPassword)
          }
          className="inline-flex h-12 w-full items-center justify-center gap-2 bg-[var(--m-ink)] text-sm font-semibold tracking-wide text-[var(--m-paper)] transition-colors hover:bg-[var(--m-ink-soft)] disabled:opacity-60"
        >
          {loading
            ? "Creating account…"
            : isCustomer
              ? "Create shopper account"
              : "Create salon account"}
          {!loading && <ArrowRight className="size-4" />}
        </button>
      </form>
    </div>
  );
}

const fieldClassName =
  "h-11 w-full border border-[var(--m-line)] bg-white px-3.5 text-base text-[var(--m-ink)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--m-muted)]/70 focus:border-[var(--m-accent)] focus:ring-4 focus:ring-[var(--m-accent)]/15 sm:h-12 sm:text-sm";
