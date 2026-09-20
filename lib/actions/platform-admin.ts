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
  country: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  whatsappPhone: string | null;
  tagline: string | null;
  phase: SubscriptionPhase;
  adminDisabled: boolean;
  lifetimeAccess: boolean;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  subscriptionLockedAt: string | null;
  subscriptionStatus: string;
  adminDisabledAt: string | null;
  lifetimeAccessAt: string | null;
  publicBookingEnabled: boolean;
  publicListingEnabled: boolean;
  referralCodeUsed: string | null;
  referredByPartnerId: string | null;
  createdAt: string;
  updatedAt: string;
  pendingPayments: number;
  daysLeftInTrial: number | null;
  hoursLeftInGrace: number | null;
  lastPayment: {
    id: string;
    status: string;
    transaction_ref: string;
    amount: number;
    currency: string;
    created_at: string;
    has_invoice: boolean;
  } | null;
};

export type PlatformStoreDetails = PlatformStoreRow & {
  ownerEmail: string | null;
  ownerName: string | null;
  ownerUserId: string | null;
  memberCount: number;
  staffCount: number;
  customerCount: number;
  saleCount: number;
  appointmentCount: number;
  payments: BillingPaymentRow[];
};

export async function listPlatformStores(): Promise<PlatformStoreRow[]> {
  await requirePlatformAdmin();
  const admin = createAdminClient();

  const { data: orgs } = await admin
    .from("organizations")
    .select(
      "id, name, slug, city, country, address, phone, email, whatsapp_phone, tagline, trial_ends_at, subscription_ends_at, subscription_locked_at, subscription_status, admin_disabled_at, lifetime_access, lifetime_access_at, public_booking_enabled, public_listing_enabled, referred_by_partner_id, referral_code_used, created_at, updated_at"
    )
    .order("name");

  const { data: pending } = await admin
    .from("subscription_payments")
    .select("organization_id")
    .eq("status", "pending");

  const { data: latestPayments } = await admin
    .from("subscription_payments")
    .select(
      "id, organization_id, status, transaction_ref, amount, currency, created_at, invoice_path"
    )
    .order("created_at", { ascending: false })
    .limit(400);

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
      currency: string | null;
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
      country: org.country,
      address: org.address,
      phone: org.phone,
      email: org.email,
      whatsappPhone: org.whatsapp_phone,
      tagline: org.tagline,
      phase: snapshot.phase,
      adminDisabled: Boolean(org.admin_disabled_at),
      lifetimeAccess: Boolean(org.lifetime_access),
      trialEndsAt: org.trial_ends_at,
      subscriptionEndsAt: org.subscription_ends_at,
      subscriptionLockedAt: org.subscription_locked_at,
      subscriptionStatus: org.subscription_status,
      adminDisabledAt: org.admin_disabled_at,
      lifetimeAccessAt: org.lifetime_access_at,
      publicBookingEnabled: Boolean(org.public_booking_enabled),
      publicListingEnabled: Boolean(org.public_listing_enabled),
      referralCodeUsed: org.referral_code_used,
      referredByPartnerId: org.referred_by_partner_id,
      createdAt: org.created_at,
      updatedAt: org.updated_at,
      pendingPayments: pendingByOrg.get(org.id) ?? 0,
      daysLeftInTrial: snapshot.daysLeftInTrial,
      hoursLeftInGrace: snapshot.hoursLeftInGrace,
      lastPayment: last
        ? {
            id: last.id,
            status: last.status,
            transaction_ref: last.transaction_ref,
            amount: Number(last.amount),
            currency: String(last.currency ?? "USD").toUpperCase(),
            created_at: last.created_at,
            has_invoice: Boolean(last.invoice_path),
          }
        : null,
    };
  });
}

/** Full salon dossier for platform admin expand panel. */
export async function getPlatformStoreDetails(
  organizationId: string
): Promise<PlatformStoreDetails | null> {
  await requirePlatformAdmin();
  const admin = createAdminClient();

  const { data: org } = await admin
    .from("organizations")
    .select(
      "id, name, slug, city, country, address, phone, email, whatsapp_phone, tagline, trial_ends_at, subscription_ends_at, subscription_locked_at, subscription_status, admin_disabled_at, lifetime_access, lifetime_access_at, public_booking_enabled, public_listing_enabled, referred_by_partner_id, referral_code_used, created_at, updated_at"
    )
    .eq("id", organizationId)
    .maybeSingle();

  if (!org) return null;

  const snapshot = resolveSubscription(org);

  const [
    membersRes,
    staffRes,
    customersRes,
    salesRes,
    appointmentsRes,
    paymentsRes,
    lastPaymentRes,
    pendingRes,
    ownerMemberRes,
  ] = await Promise.all([
    admin
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    admin
      .from("staff")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    admin
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    admin
      .from("sales")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    admin
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    admin
      .from("subscription_payments")
      .select(
        "id, organization_id, amount, currency, payment_method, transaction_ref, payer_name, notes, status, jazzcash_number, created_at, reviewed_at, review_notes, invoice_path, invoice_mime"
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("subscription_payments")
      .select(
        "id, organization_id, status, transaction_ref, amount, currency, created_at, invoice_path"
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("subscription_payments")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "pending"),
    admin
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("role", "OWNER")
      .limit(1)
      .maybeSingle(),
  ]);

  let ownerEmail: string | null = null;
  let ownerName: string | null = null;
  const ownerUserId = ownerMemberRes.data?.user_id ?? null;
  if (ownerUserId) {
    try {
      const { data: authUser } = await admin.auth.admin.getUserById(ownerUserId);
      ownerEmail = authUser.user?.email ?? null;
      const meta = authUser.user?.user_metadata as
        | { full_name?: string; name?: string }
        | undefined;
      ownerName =
        (typeof meta?.full_name === "string" && meta.full_name) ||
        (typeof meta?.name === "string" && meta.name) ||
        null;
    } catch {
      /* auth lookup optional */
    }
  }

  const last = lastPaymentRes.data;
  const store: PlatformStoreRow = {
    id: org.id,
    name: org.name,
    slug: org.slug,
    city: org.city,
    country: org.country,
    address: org.address,
    phone: org.phone,
    email: org.email,
    whatsappPhone: org.whatsapp_phone,
    tagline: org.tagline,
    phase: snapshot.phase,
    adminDisabled: Boolean(org.admin_disabled_at),
    lifetimeAccess: Boolean(org.lifetime_access),
    trialEndsAt: org.trial_ends_at,
    subscriptionEndsAt: org.subscription_ends_at,
    subscriptionLockedAt: org.subscription_locked_at,
    subscriptionStatus: org.subscription_status,
    adminDisabledAt: org.admin_disabled_at,
    lifetimeAccessAt: org.lifetime_access_at,
    publicBookingEnabled: Boolean(org.public_booking_enabled),
    publicListingEnabled: Boolean(org.public_listing_enabled),
    referralCodeUsed: org.referral_code_used,
    referredByPartnerId: org.referred_by_partner_id,
    createdAt: org.created_at,
    updatedAt: org.updated_at,
    pendingPayments: pendingRes.count ?? 0,
    daysLeftInTrial: snapshot.daysLeftInTrial,
    hoursLeftInGrace: snapshot.hoursLeftInGrace,
    lastPayment: last
      ? {
          id: last.id,
          status: last.status,
          transaction_ref: last.transaction_ref,
          amount: Number(last.amount),
          currency: String(last.currency ?? "USD").toUpperCase(),
          created_at: last.created_at,
          has_invoice: Boolean(last.invoice_path),
        }
      : null,
  };

  const payments: BillingPaymentRow[] = (paymentsRes.data ?? []).map((row) => {
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
      organization_name: store.name,
      organization_slug: store.slug,
      organization_city: store.city,
      organization_country: store.country,
    };
  });

  return {
    ...store,
    ownerEmail,
    ownerName,
    ownerUserId,
    memberCount: membersRes.count ?? 0,
    staffCount: staffRes.count ?? 0,
    customerCount: customersRes.count ?? 0,
    saleCount: salesRes.count ?? 0,
    appointmentCount: appointmentsRes.count ?? 0,
    payments,
  };
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
 * When enabled: no monthly USDT subscription is required.
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
