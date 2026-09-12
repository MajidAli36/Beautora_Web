"use server";

import { revalidatePath } from "next/cache";
import {
  isPlatformAdminEmail,
  resolveSubscription,
  SUBSCRIPTION,
  type SubscriptionPhase,
} from "@/lib/billing/subscription";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/commerce";
import type { BillingPaymentRow } from "@/lib/actions/billing";

async function requirePlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isPlatformAdminEmail(user.email)) {
    throw new Error("Platform admin only");
  }
  return user;
}

export type PlatformStoreRow = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  phase: SubscriptionPhase;
  adminDisabled: boolean;
  lifetimeAccess: boolean;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  pendingPayments: number;
  daysLeftInTrial: number | null;
  hoursLeftInGrace: number | null;
  lastPayment: {
    id: string;
    status: string;
    transaction_ref: string;
    amount: number;
    created_at: string;
    has_invoice: boolean;
  } | null;
};

export async function listPlatformStores(): Promise<PlatformStoreRow[]> {
  await requirePlatformAdmin();
  const admin = createAdminClient();

  const { data: orgs } = await admin
    .from("organizations")
    .select(
      "id, name, slug, city, trial_ends_at, subscription_ends_at, subscription_locked_at, subscription_status, admin_disabled_at, lifetime_access, created_at"
    )
    .order("name");

  const { data: pending } = await admin
    .from("subscription_payments")
    .select("organization_id")
    .eq("status", "pending");

  const { data: latestPayments } = await admin
    .from("subscription_payments")
    .select("id, organization_id, status, transaction_ref, amount, created_at, invoice_path")
    .order("created_at", { ascending: false })
    .limit(200);

  const pendingByOrg = new Map<string, number>();
  for (const row of pending ?? []) {
    pendingByOrg.set(
      row.organization_id,
      (pendingByOrg.get(row.organization_id) ?? 0) + 1
    );
  }

  const lastByOrg = new Map<
    string,
    {
      id: string;
      organization_id: string;
      status: string;
      transaction_ref: string;
      amount: number;
      created_at: string;
      invoice_path: string | null;
    }
  >();
  for (const row of latestPayments ?? []) {
    if (!lastByOrg.has(row.organization_id)) {
      lastByOrg.set(row.organization_id, row);
    }
  }

  return (orgs ?? []).map((org) => {
    const snapshot = resolveSubscription(org);
    const last = lastByOrg.get(org.id) ?? null;
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      city: org.city,
      phase: snapshot.phase,
      adminDisabled: Boolean(org.admin_disabled_at),
      lifetimeAccess: Boolean(org.lifetime_access),
      trialEndsAt: org.trial_ends_at,
      subscriptionEndsAt: org.subscription_ends_at,
      pendingPayments: pendingByOrg.get(org.id) ?? 0,
      daysLeftInTrial: snapshot.daysLeftInTrial,
      hoursLeftInGrace: snapshot.hoursLeftInGrace,
      lastPayment: last
        ? {
            id: last.id,
            status: last.status,
            transaction_ref: last.transaction_ref,
            amount: Number(last.amount),
            created_at: last.created_at,
            has_invoice: Boolean(last.invoice_path),
          }
        : null,
    };
  });
}

/** Enable or disable a store from the platform admin panel. */
export async function setPlatformStoreEnabled(input: {
  organizationId: string;
  enabled: boolean;
}): Promise<ActionResult> {
  await requirePlatformAdmin();
  const admin = createAdminClient();

  if (!input.enabled) {
    const { error } = await admin
      .from("organizations")
      .update({
        admin_disabled_at: new Date().toISOString(),
        subscription_status: "locked",
        subscription_locked_at: new Date().toISOString(),
      })
      .eq("id", input.organizationId);
    if (error) return { error: error.message };

    try {
      const { sendSubscriptionDeactivatedEmail } = await import("@/lib/email/notify");
      await sendSubscriptionDeactivatedEmail({
        organizationId: input.organizationId,
        reason: "locked",
        eventKey: `admin-lock:${input.organizationId}:${Date.now()}`,
      });
    } catch (err) {
      console.error("[platform] lock email failed", err);
    }
  } else {
    const now = new Date();
    const nextEnd = new Date(now.getTime());
    nextEnd.setUTCDate(nextEnd.getUTCDate() + 30);

    const { error } = await admin
      .from("organizations")
      .update({
        admin_disabled_at: null,
        subscription_locked_at: null,
        subscription_status: "active",
        subscription_ends_at: nextEnd.toISOString(),
      })
      .eq("id", input.organizationId);
    if (error) return { error: error.message };

    try {
      const { sendSubscriptionActivatedEmail } = await import("@/lib/email/notify");
      await sendSubscriptionActivatedEmail({
        organizationId: input.organizationId,
        paymentId: `admin-enable:${input.organizationId}:${now.toISOString()}`,
        amount: SUBSCRIPTION.monthlyAmountPkr,
        renewsAt: nextEnd.toISOString(),
      });
    } catch (err) {
      console.error("[platform] enable email failed", err);
    }
  }

  revalidatePath("/platform");
  revalidatePath("/billing");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Grant or revoke lifetime / complimentary access for a store.
 * When enabled: no monthly JazzCash subscription is required.
 * When disabled: store returns to normal trial/paid/grace/locked rules.
 * Force-disable (admin_disabled_at) still locks the store even with lifetime.
 */
export async function setPlatformStoreLifetimeAccess(input: {
  organizationId: string;
  enabled: boolean;
}): Promise<ActionResult> {
  const user = await requirePlatformAdmin();
  const admin = createAdminClient();

  if (input.enabled) {
    const { error } = await admin
      .from("organizations")
      .update({
        lifetime_access: true,
        lifetime_access_at: new Date().toISOString(),
        lifetime_access_by: user.id,
        admin_disabled_at: null,
        subscription_locked_at: null,
        subscription_status: "lifetime",
      })
      .eq("id", input.organizationId);
    if (error) return { error: error.message };
  } else {
    const { data: org } = await admin
      .from("organizations")
      .select(
        "trial_ends_at, subscription_ends_at, subscription_locked_at, subscription_status, admin_disabled_at, created_at"
      )
      .eq("id", input.organizationId)
      .maybeSingle();

    const nextPhase = org
      ? resolveSubscription({ ...org, lifetime_access: false }).phase
      : "locked";

    const { error } = await admin
      .from("organizations")
      .update({
        lifetime_access: false,
        lifetime_access_at: null,
        lifetime_access_by: null,
        subscription_status:
          nextPhase === "lifetime" ? "active" : nextPhase,
        subscription_locked_at:
          nextPhase === "locked"
            ? new Date().toISOString()
            : null,
      })
      .eq("id", input.organizationId);
    if (error) return { error: error.message };
  }

  revalidatePath("/platform");
  revalidatePath("/billing");
  revalidatePath("/dashboard");
  revalidatePath("/stores");
  return { success: true };
}

export async function listPlatformPayments(status?: "pending" | "all"): Promise<
  BillingPaymentRow[]
> {
  await requirePlatformAdmin();
  const admin = createAdminClient();

  let query = admin
    .from("subscription_payments")
    .select(
      "id, organization_id, amount, currency, payment_method, transaction_ref, payer_name, notes, status, jazzcash_number, created_at, reviewed_at, review_notes, invoice_path, invoice_mime, organization:organizations(name, slug, city, country)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (status === "pending") {
    query = query.eq("status", "pending");
  }

  const { data } = await query;

  return (data ?? []).map((row) => {
    const org = row.organization as {
      name?: string;
      slug?: string;
      city?: string | null;
      country?: string | null;
    } | null;
    const method =
      row.payment_method === "usdt_bep20" ? ("usdt_bep20" as const) : ("jazzcash" as const);
    return {
      id: row.id,
      amount: Number(row.amount),
      currency: String(row.currency ?? (method === "usdt_bep20" ? "USD" : "PKR")).toUpperCase(),
      payment_method: method,
      transaction_ref: row.transaction_ref,
      payer_name: row.payer_name,
      notes: row.notes,
      status: row.status as BillingPaymentRow["status"],
      jazzcash_number: row.jazzcash_number,
      created_at: row.created_at,
      reviewed_at: row.reviewed_at,
      review_notes: row.review_notes,
      has_invoice: Boolean(row.invoice_path),
      invoice_mime: row.invoice_mime ?? null,
      organization_id: row.organization_id,
      organization_name: org?.name ?? "Store",
      organization_slug: org?.slug,
      organization_city: org?.city ?? null,
      organization_country: org?.country ?? null,
    };
  });
}

export async function getPlatformAdminSummary() {
  await requirePlatformAdmin();
  const stores = await listPlatformStores();
  const payments = await listPlatformPayments("all");
  return {
    storeCount: stores.length,
    disabledCount: stores.filter((s) => s.adminDisabled || s.phase === "locked").length,
    pendingInvoices: payments.filter((p) => p.status === "pending").length,
    monthlyFee: SUBSCRIPTION.monthlyAmountPkr,
  };
}
