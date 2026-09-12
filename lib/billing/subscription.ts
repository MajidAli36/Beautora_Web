/** Beautora store subscription — trial, grace, regional renewals (JazzCash / USDT) */

import { isHardcodedPlatformAdminEmail } from "@/lib/platform/admin";
import {
  INTERNATIONAL_PLAN,
  PAKISTAN_PLAN,
  formatPlanAmount,
  resolveBillingPlanFromCountry,
  type BillingPlan,
} from "@/lib/billing/plans";

export const SUBSCRIPTION = {
  /** @deprecated Prefer resolveBillingPlanFromCountry — kept for legacy PKR displays */
  monthlyAmountPkr: PAKISTAN_PLAN.amount,
  /** Free trial length after salon creation */
  trialDays: 30,
  /** Paid access length after each approved payment */
  periodDays: 30,
  /** Soft window after trial/period ends before hard lock (still operational) */
  graceDays: 3,
  /** Caution popup interval during grace (ms) */
  cautionPopupIntervalMs: 60 * 60 * 1000,
  jazzcashNumber: PAKISTAN_PLAN.destination,
  jazzcashDisplay: PAKISTAN_PLAN.destinationDisplay,
  currencyLabel: PAKISTAN_PLAN.currencyLabel,
  /** International plan constants */
  usdtAmountUsd: INTERNATIONAL_PLAN.amount,
  usdtWallet: INTERNATIONAL_PLAN.destination,
  usdtNetwork: INTERNATIONAL_PLAN.networkLabel!,
} as const;

export type { BillingPlan, BillingMethod } from "@/lib/billing/plans";
export {
  PAKISTAN_PLAN,
  INTERNATIONAL_PLAN,
  resolveBillingPlanFromCountry,
  formatPlanAmount,
  formatStoredPaymentAmount,
  isPakistanCountry,
} from "@/lib/billing/plans";

export type SubscriptionPhase = "trial" | "active" | "grace" | "locked" | "lifetime";

export type OrgSubscriptionFields = {
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  subscription_locked_at: string | null;
  subscription_status?: string | null;
  admin_disabled_at?: string | null;
  lifetime_access?: boolean | null;
  created_at?: string | null;
  country?: string | null;
};

export type SubscriptionSnapshot = {
  phase: SubscriptionPhase;
  trialEndsAt: Date | null;
  subscriptionEndsAt: Date | null;
  graceEndsAt: Date | null;
  lockedAt: Date | null;
  daysLeftInTrial: number | null;
  hoursLeftInGrace: number | null;
  isOperational: boolean;
  /** True when SyncOps granted lifetime / complimentary access (no monthly fee). */
  lifetimeAccess: boolean;
  /** Regional payment plan for this store */
  plan: BillingPlan;
  /** Legacy PKR fields (JazzCash) — prefer `plan` */
  amountPkr: number;
  jazzcashNumber: string;
  jazzcashDisplay: string;
};

function addDays(date: Date, days: number) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function daysBetween(from: Date, to: Date) {
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function hoursBetween(from: Date, to: Date) {
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60));
}

export function resolveSubscription(
  org: OrgSubscriptionFields,
  now = new Date()
): SubscriptionSnapshot {
  const plan = resolveBillingPlanFromCountry(org.country);
  const trialEndsAt = org.trial_ends_at
    ? new Date(org.trial_ends_at)
    : org.created_at
      ? addDays(new Date(org.created_at), SUBSCRIPTION.trialDays)
      : null;

  const subscriptionEndsAt = org.subscription_ends_at
    ? new Date(org.subscription_ends_at)
    : null;

  const base = {
    trialEndsAt,
    plan,
    amountPkr: PAKISTAN_PLAN.amount,
    jazzcashNumber: PAKISTAN_PLAN.destination,
    jazzcashDisplay: PAKISTAN_PLAN.destinationDisplay,
    lifetimeAccess: Boolean(org.lifetime_access),
  };

  if (org.admin_disabled_at) {
    return {
      ...base,
      phase: "locked" as const,
      subscriptionEndsAt,
      graceEndsAt: null,
      lockedAt: new Date(org.admin_disabled_at),
      daysLeftInTrial: null,
      hoursLeftInGrace: 0,
      isOperational: false,
    };
  }

  if (org.lifetime_access) {
    return {
      ...base,
      phase: "lifetime" as const,
      subscriptionEndsAt,
      graceEndsAt: null,
      lockedAt: null,
      daysLeftInTrial: null,
      hoursLeftInGrace: null,
      isOperational: true,
    };
  }

  const paidUntil =
    subscriptionEndsAt && subscriptionEndsAt > now ? subscriptionEndsAt : null;

  if (paidUntil) {
    return {
      ...base,
      phase: "active" as const,
      subscriptionEndsAt: paidUntil,
      graceEndsAt: null,
      lockedAt: null,
      daysLeftInTrial: null,
      hoursLeftInGrace: null,
      isOperational: true,
    };
  }

  if (trialEndsAt && now < trialEndsAt) {
    return {
      ...base,
      phase: "trial" as const,
      subscriptionEndsAt,
      graceEndsAt: addDays(trialEndsAt, SUBSCRIPTION.graceDays),
      lockedAt: null,
      daysLeftInTrial: Math.max(0, daysBetween(now, trialEndsAt)),
      hoursLeftInGrace: null,
      isOperational: true,
    };
  }

  const graceStart =
    subscriptionEndsAt && trialEndsAt && subscriptionEndsAt > trialEndsAt
      ? subscriptionEndsAt
      : trialEndsAt ?? now;
  const graceEndsAt = addDays(graceStart, SUBSCRIPTION.graceDays);

  if (now < graceEndsAt) {
    return {
      ...base,
      phase: "grace" as const,
      subscriptionEndsAt,
      graceEndsAt,
      lockedAt: null,
      daysLeftInTrial: null,
      hoursLeftInGrace: Math.max(0, hoursBetween(now, graceEndsAt)),
      isOperational: true,
    };
  }

  return {
    ...base,
    phase: "locked" as const,
    subscriptionEndsAt,
    graceEndsAt,
    lockedAt: org.subscription_locked_at
      ? new Date(org.subscription_locked_at)
      : graceEndsAt,
    daysLeftInTrial: null,
    hoursLeftInGrace: 0,
    isOperational: false,
  };
}

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (isHardcodedPlatformAdminEmail(normalized)) return true;

  const raw = process.env.BEAUTORA_PLATFORM_ADMIN_EMAILS ?? "";
  const list = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(normalized);
}
