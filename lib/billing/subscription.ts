/** Beautora store subscription — trial, grace, JazzCash renewals */

import { isHardcodedPlatformAdminEmail } from "@/lib/platform/admin";

export const SUBSCRIPTION = {
  monthlyAmountPkr: 3000,
  trialDays: 30,
  graceDays: 3,
  /** Caution popup interval during grace (ms) */
  cautionPopupIntervalMs: 60 * 60 * 1000,
  jazzcashNumber: "03226400409",
  jazzcashDisplay: "0322 6400409",
  currencyLabel: "Rs",
} as const;

export type SubscriptionPhase = "trial" | "active" | "grace" | "locked";

export type OrgSubscriptionFields = {
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  subscription_locked_at: string | null;
  subscription_status?: string | null;
  admin_disabled_at?: string | null;
  created_at?: string | null;
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
    amountPkr: SUBSCRIPTION.monthlyAmountPkr,
    jazzcashNumber: SUBSCRIPTION.jazzcashNumber,
    jazzcashDisplay: SUBSCRIPTION.jazzcashDisplay,
  };

  // Platform admin force-disable — always locked
  if (org.admin_disabled_at) {
    return {
      ...base,
      phase: "locked",
      subscriptionEndsAt,
      graceEndsAt: null,
      lockedAt: new Date(org.admin_disabled_at),
      daysLeftInTrial: null,
      hoursLeftInGrace: 0,
      isOperational: false,
    };
  }

  const paidUntil =
    subscriptionEndsAt && subscriptionEndsAt > now ? subscriptionEndsAt : null;

  if (paidUntil) {
    return {
      ...base,
      phase: "active",
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
      phase: "trial",
      subscriptionEndsAt,
      graceEndsAt: addDays(trialEndsAt, SUBSCRIPTION.graceDays),
      lockedAt: null,
      daysLeftInTrial: Math.max(0, daysBetween(now, trialEndsAt)),
      hoursLeftInGrace: null,
      isOperational: true,
    };
  }

  // Grace starts when trial (or last paid period) ends
  const graceStart =
    subscriptionEndsAt && trialEndsAt && subscriptionEndsAt > trialEndsAt
      ? subscriptionEndsAt
      : trialEndsAt ?? now;
  const graceEndsAt = addDays(graceStart, SUBSCRIPTION.graceDays);

  if (now < graceEndsAt) {
    return {
      ...base,
      phase: "grace",
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
    phase: "locked",
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
  // Only SyncOps hardcoded admin + optional env list — never treat store owners as admin
  if (isHardcodedPlatformAdminEmail(normalized)) return true;

  const raw = process.env.BEAUTORA_PLATFORM_ADMIN_EMAILS ?? "";
  const list = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(normalized);
}
