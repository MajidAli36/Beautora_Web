import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  resolveSubscription,
  type SubscriptionSnapshot,
} from "@/lib/billing/subscription";

export const SUBSCRIPTION_LOCKED_MESSAGE =
  "This store is locked — monthly subscription payment is required. Open Billing to renew.";

export function orgSubscriptionCacheTag(organizationId: string) {
  return `org-subscription:${organizationId}`;
}

type OrgBillingRow = {
  id: string;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  subscription_locked_at: string | null;
  subscription_status: string | null;
  admin_disabled_at: string | null;
  lifetime_access: boolean | null;
  created_at: string | null;
  country?: string | null;
  name?: string | null;
};

async function loadOrgSubscriptionUncached(
  organizationId: string
): Promise<SubscriptionSnapshot | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select(
      "id, name, country, trial_ends_at, subscription_ends_at, subscription_locked_at, subscription_status, admin_disabled_at, lifetime_access, created_at"
    )
    .eq("id", organizationId)
    .maybeSingle();

  if (!data) return null;
  return resolveSubscription(data as OrgBillingRow);
}

/**
 * Load + resolve subscription for an org.
 * Per-request memo + short cross-request cache. Read-only — no status writes.
 */
export const getOrgSubscriptionSnapshot = cache(
  async (organizationId: string): Promise<SubscriptionSnapshot | null> => {
    return unstable_cache(
      () => loadOrgSubscriptionUncached(organizationId),
      ["org-subscription", organizationId],
      {
        revalidate: 60,
        tags: [orgSubscriptionCacheTag(organizationId)],
      }
    )();
  }
);

/**
 * Persist derived subscription_status when it drifts (billing admin / payment flows only).
 * Never call this from requireAction / layout hot paths.
 */
export async function syncOrgSubscriptionStatus(
  organizationId: string
): Promise<SubscriptionSnapshot | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select(
      "id, country, trial_ends_at, subscription_ends_at, subscription_locked_at, subscription_status, admin_disabled_at, lifetime_access, created_at"
    )
    .eq("id", organizationId)
    .maybeSingle();

  if (!data) return null;

  const snapshot = resolveSubscription(data as OrgBillingRow);

  if (snapshot.phase === "lifetime") {
    if (data.subscription_status !== "lifetime" || data.subscription_locked_at) {
      await admin
        .from("organizations")
        .update({
          subscription_status: "lifetime",
          subscription_locked_at: null,
        })
        .eq("id", organizationId);
    }
  } else if (snapshot.phase === "locked") {
    if (data.subscription_status !== "locked" || !data.subscription_locked_at) {
      await admin
        .from("organizations")
        .update({
          subscription_status: "locked",
          subscription_locked_at:
            data.subscription_locked_at ?? new Date().toISOString(),
        })
        .eq("id", organizationId);
    }
  } else if (snapshot.phase === "grace" && data.subscription_status !== "grace") {
    await admin
      .from("organizations")
      .update({ subscription_status: "grace" })
      .eq("id", organizationId);
  } else if (
    snapshot.phase === "active" &&
    data.subscription_status !== "active"
  ) {
    await admin
      .from("organizations")
      .update({
        subscription_status: "active",
        subscription_locked_at: null,
      })
      .eq("id", organizationId);
  }

  return snapshot;
}

export async function isOrgOperational(organizationId: string): Promise<boolean> {
  const snapshot = await getOrgSubscriptionSnapshot(organizationId);
  return Boolean(snapshot?.isOperational);
}

/**
 * Hard gate: after trial/paid month (+ grace) without payment, store is disabled.
 * Throws so server actions / POS / APIs cannot continue while locked.
 */
export async function assertOrgOperational(organizationId: string): Promise<void> {
  const snapshot = await getOrgSubscriptionSnapshot(organizationId);
  if (!snapshot || snapshot.isOperational) return;
  throw new Error(SUBSCRIPTION_LOCKED_MESSAGE);
}
