"use server";

import { revalidatePath } from "next/cache";
import {
  classifyAuthMetadata,
  type AuthAccountKind,
} from "@/lib/auth/email-guards";
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

export type PlatformPaymentAccount = {
  id: string;
  accountType: string;
  label: string;
  accountTitle: string | null;
  accountNumber: string;
  bankName: string | null;
  extraNote: string | null;
  isActive: boolean;
};

export type PlatformStoreDetails = PlatformStoreRow & {
  ownerEmail: string | null;
  ownerName: string | null;
  ownerUserId: string | null;
  ownerPhone: string | null;
  memberCount: number;
  staffCount: number;
  customerCount: number;
  saleCount: number;
  appointmentCount: number;
  payments: BillingPaymentRow[];
  paymentAccounts: PlatformPaymentAccount[];
  /** Best-available contact for admin (fills empty profile fields). */
  displayAddress: string | null;
  displayAddressNote: string | null;
  displayPhone: string | null;
  displayPhoneNote: string | null;
  displayWhatsapp: string | null;
  displayWhatsappNote: string | null;
  displayEmail: string | null;
  displayEmailNote: string | null;
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
    paymentAccountsRes,
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
    admin
      .from("organization_payment_accounts")
      .select(
        "id, account_type, label, account_title, account_number, bank_name, extra_note, is_active"
      )
      .eq("organization_id", organizationId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  let ownerEmail: string | null = null;
  let ownerName: string | null = null;
  let ownerPhone: string | null = null;
  const ownerUserId = ownerMemberRes.data?.user_id ?? null;
  if (ownerUserId) {
    try {
      const { data: authUser } = await admin.auth.admin.getUserById(ownerUserId);
      const user = authUser.user;
      ownerEmail = user?.email ?? null;
      ownerPhone = user?.phone?.trim() || null;
      const meta = user?.user_metadata as
        | { full_name?: string; name?: string; salon_name?: string }
        | undefined;
      ownerName =
        (typeof meta?.full_name === "string" && meta.full_name.trim()) ||
        (typeof meta?.name === "string" && meta.name.trim()) ||
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

  const paymentAccounts: PlatformPaymentAccount[] = (paymentAccountsRes.data ?? []).map(
    (row) => ({
      id: row.id,
      accountType: row.account_type,
      label: row.label,
      accountTitle: row.account_title,
      accountNumber: row.account_number,
      bankName: row.bank_name,
      extraNote: row.extra_note,
      isActive: row.is_active,
    })
  );

  const locationLine = [org.city?.trim(), org.country?.trim()].filter(Boolean).join(", ") || null;
  const profileAddress = org.address?.trim() || null;
  const profilePhone = org.phone?.trim() || null;
  const profileWhatsapp = org.whatsapp_phone?.trim() || null;
  const profileEmail = org.email?.trim() || null;

  let displayAddress = profileAddress;
  let displayAddressNote: string | null = null;
  if (!displayAddress && locationLine) {
    displayAddress = locationLine;
    displayAddressNote = "From city / country (street address not set yet)";
  }

  let displayPhone = profilePhone;
  let displayPhoneNote: string | null = null;
  if (!displayPhone && profileWhatsapp) {
    displayPhone = profileWhatsapp;
    displayPhoneNote = "From WhatsApp number (store phone not set)";
  } else if (!displayPhone && ownerPhone) {
    displayPhone = ownerPhone;
    displayPhoneNote = "From owner auth phone";
  }

  let displayWhatsapp = profileWhatsapp;
  let displayWhatsappNote: string | null = null;
  if (!displayWhatsapp && profilePhone) {
    displayWhatsapp = profilePhone;
    displayWhatsappNote = "From store phone (WhatsApp not set)";
  }

  let displayEmail = profileEmail;
  let displayEmailNote: string | null = null;
  if (!displayEmail && ownerEmail) {
    displayEmail = ownerEmail;
    displayEmailNote = "From owner login email (store profile email not set)";
  }

  return {
    ...store,
    ownerEmail,
    ownerName,
    ownerUserId,
    ownerPhone,
    memberCount: membersRes.count ?? 0,
    staffCount: staffRes.count ?? 0,
    customerCount: customersRes.count ?? 0,
    saleCount: salesRes.count ?? 0,
    appointmentCount: appointmentsRes.count ?? 0,
    payments,
    paymentAccounts,
    displayAddress,
    displayAddressNote,
    displayPhone,
    displayPhoneNote,
    displayWhatsapp,
    displayWhatsappNote,
    displayEmail,
    displayEmailNote,
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

export type PlatformUserStatus = "pending" | "active" | "banned";
export type PlatformUserRole = AuthAccountKind;

export type PlatformUserRow = {
  id: string;
  email: string;
  status: PlatformUserStatus;
  role: PlatformUserRole;
  displayName: string | null;
  partnerStatus: "pending" | "approved" | "rejected" | null;
  organizationName: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
};

function resolveUserStatus(user: {
  email_confirmed_at?: string | null;
  banned_until?: string | null;
}): PlatformUserStatus {
  if (user.banned_until) {
    const until = new Date(user.banned_until).getTime();
    if (!Number.isNaN(until) && until > Date.now()) return "banned";
  }
  if (!user.email_confirmed_at) return "pending";
  return "active";
}

function displayNameFromMeta(meta: Record<string, unknown> | undefined): string | null {
  if (!meta) return null;
  for (const key of ["full_name", "salon_name", "partner_username", "name"]) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

/** All auth users with email / account / partner status for platform admin. */
export async function listPlatformUsers(): Promise<PlatformUserRow[]> {
  await requirePlatformAdmin();
  const admin = createAdminClient();

  const authUsers: Awaited<
    ReturnType<typeof admin.auth.admin.listUsers>
  >["data"]["users"] = [];

  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw new Error(error.message);
    authUsers.push(...data.users);
    if (data.users.length < 200) break;
  }

  const userIds = authUsers.map((u) => u.id);

  const [{ data: partners }, { data: memberships }] = await Promise.all([
    admin
      .from("partners")
      .select("user_id, status, username, full_name")
      .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]),
    admin
      .from("organization_members")
      .select("user_id, role, organization:organizations(name)")
      .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]),
  ]);

  const partnerByUser = new Map(
    (partners ?? []).map((p) => [
      p.user_id as string,
      {
        status: p.status as "pending" | "approved" | "rejected",
        username: p.username as string | null,
        fullName: p.full_name as string | null,
      },
    ])
  );

  const orgByUser = new Map<string, string>();
  for (const row of memberships ?? []) {
    const org = row.organization as { name?: string } | null;
    if (row.user_id && org?.name && !orgByUser.has(row.user_id)) {
      orgByUser.set(row.user_id, org.name);
    }
  }

  return authUsers
    .map((user) => {
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const role = classifyAuthMetadata(meta, user.email);
      const partner = partnerByUser.get(user.id) ?? null;
      const displayName =
        displayNameFromMeta(meta) ||
        partner?.fullName ||
        (partner?.username ? `@${partner.username}` : null);

      return {
        id: user.id,
        email: user.email ?? "(no email)",
        status: resolveUserStatus(user),
        role,
        displayName,
        partnerStatus: partner?.status ?? null,
        organizationName: orgByUser.get(user.id) ?? null,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
        emailConfirmedAt: user.email_confirmed_at ?? null,
      } satisfies PlatformUserRow;
    })
    .sort((a, b) => {
      const rank = { pending: 0, banned: 1, active: 2 } as const;
      const byStatus = rank[a.status] - rank[b.status];
      if (byStatus !== 0) return byStatus;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

/** Delete an unverified (pending) auth user so they can sign up again. */
export async function deletePlatformPendingUser(
  userId: string
): Promise<ActionResult> {
  await requirePlatformAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) return { error: "User not found" };
  if (data.user.email_confirmed_at) {
    return { error: "Only pending (unverified) users can be deleted here" };
  }
  if (isPlatformAdminEmail(data.user.email)) {
    return { error: "Cannot delete platform admin" };
  }

  await admin.from("partners").delete().eq("user_id", userId);
  await admin.from("organization_members").delete().eq("user_id", userId);
  await admin.from("team_invitations").delete().eq("email", data.user.email ?? "");

  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) return { error: delErr.message };

  revalidatePath("/platform");
  revalidatePath("/platform/users");
  return { success: true };
}
