"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdminEmail } from "@/lib/billing/subscription";
import { SUBSCRIPTION } from "@/lib/billing/subscription";
import {
  normalizePartnerUsername,
  PARTNER_REF_COOKIE,
  PARTNER_REF_MAX_AGE_DAYS,
  validatePartnerUsername,
} from "@/lib/partners/referral";
import {
  getEmailBlockReason,
  normalizeEmail,
} from "@/lib/auth/email-guards";
import type { ActionResult } from "@/types/commerce";

export type PartnerStatus = "pending" | "approved" | "rejected";

export type PartnerRow = {
  id: string;
  user_id: string | null;
  username: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  status: PartnerStatus;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  referredStoreCount: number;
  earnedTotalPkr: number;
};

export type PartnerCommissionRow = {
  id: string;
  amount_pkr: number;
  currency: string;
  status: "earned" | "paid" | "void";
  created_at: string;
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  subscription_payment_id: string;
};

export type PartnerReferredStore = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  created_at: string;
  subscription_status: string;
  /** Salon owner contact (referral user) */
  owner_email: string | null;
  owner_name: string | null;
  /** Clear partner-facing lifecycle */
  referral_phase:
    | "trial"
    | "awaiting_first_payment"
    | "earned"
    | "paid_out";
  commission_amount_pkr: number | null;
  commission_status: "earned" | "paid" | "void" | null;
  commission_at: string | null;
};

/** Persist referral code from marketing/signup links (30 days). */
export async function rememberPartnerReferral(
  code: string
): Promise<ActionResult & { username?: string }> {
  const validated = validatePartnerUsername(code);
  if (!validated.ok) return { error: validated.error };

  const admin = createAdminClient();
  const { data } = await admin
    .from("partners")
    .select("id, status, username")
    .eq("username", validated.username)
    .maybeSingle();

  if (!data || data.status !== "approved") {
    return { error: "This partner referral link is not active yet" };
  }

  const jar = await cookies();
  const isProd =
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production";
  jar.set(PARTNER_REF_COOKIE, data.username, {
    path: "/",
    maxAge: PARTNER_REF_MAX_AGE_DAYS * 24 * 60 * 60,
    sameSite: "lax",
    httpOnly: true,
    secure: isProd,
  });
  return { success: true, username: data.username };
}

export async function getRememberedPartnerReferral(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(PARTNER_REF_COOKIE)?.value;
  if (!raw) return null;
  const validated = validatePartnerUsername(raw);
  return validated.ok ? validated.username : null;
}

/** Resolve an approved partner by username (for org creation). */
export async function resolveApprovedPartnerByUsername(code: string | null | undefined): Promise<{
  id: string;
  username: string;
  email: string;
  user_id: string | null;
} | null> {
  if (!code?.trim()) return null;
  const validated = validatePartnerUsername(code);
  if (!validated.ok) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("partners")
    .select("id, username, email, user_id, status")
    .eq("username", validated.username)
    .maybeSingle();

  if (!data || data.status !== "approved") return null;
  return {
    id: data.id,
    username: data.username,
    email: data.email,
    user_id: data.user_id,
  };
}

/**
 * Partner application: creates unconfirmed auth user + pending partners row,
 * then emails a verification link via Resend. Client should NOT auto-login.
 */
export async function applyAsPartner(input: {
  email: string;
  password: string;
  username: string;
  fullName?: string;
  phone?: string;
}): Promise<ActionResult & { needsEmailVerification?: boolean }> {
  const email = normalizeEmail(input.email);
  const password = input.password;
  const validated = validatePartnerUsername(input.username);
  if (!validated.ok) return { error: validated.error };
  if (!email || !email.includes("@")) return { error: "Enter a valid email address" };
  if (password.length < 8) return { error: "Password must be at least 8 characters" };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY" };
  }

  const username = validated.username;
  const fullName = input.fullName?.trim() || null;
  const phone = input.phone?.trim() || null;

  const { data: usernameClash } = await admin
    .from("partners")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (usernameClash) return { error: "This username is already taken" };

  try {
    const blocked = await getEmailBlockReason(admin, email, "partner_apply");
    if (blocked) return { error: blocked };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not check email" };
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: {
      account_type: "partner",
      partner_username: username,
      full_name: fullName,
    },
  });

  if (createErr || !created.user) {
    const msg = createErr?.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      return { error: "An account with this email already exists. Please sign in." };
    }
    return { error: createErr?.message ?? "Could not create partner account" };
  }

  const { error: insertErr } = await admin.from("partners").insert({
    user_id: created.user.id,
    username,
    email,
    full_name: fullName,
    phone,
    status: "pending",
  });

  if (insertErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    if (insertErr.message.toLowerCase().includes("unique")) {
      return { error: "Username or email is already registered as a partner" };
    }
    return { error: insertErr.message };
  }

  const { sendPartnerSignupVerificationEmail } = await import("@/lib/email/notify");
  const mailed = await sendPartnerSignupVerificationEmail({
    email,
    username,
    fullName,
    userId: created.user.id,
  });

  if (!mailed.ok) {
    await admin.from("partners").delete().eq("user_id", created.user.id);
    await admin.auth.admin.deleteUser(created.user.id);
    return {
      error: mailed.skipped
        ? "Email is not configured on the server. Please try again later."
        : `Could not send verification email: ${mailed.error}`,
    };
  }

  revalidatePath("/platform");
  revalidatePath("/partner");
  return { success: true, needsEmailVerification: true };
}

export async function getPartnerForUser(userId: string): Promise<{
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  status: PartnerStatus;
  review_notes: string | null;
} | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("partners")
    .select("id, username, email, full_name, status, review_notes")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    ...data,
    status: data.status as PartnerStatus,
  };
}

export async function getPartnerDashboard(): Promise<{
  partner: {
    id: string;
    username: string;
    email: string;
    full_name: string | null;
    status: PartnerStatus;
    review_notes: string | null;
    created_at: string;
  };
  stores: PartnerReferredStore[];
  commissions: PartnerCommissionRow[];
  totals: {
    referredStores: number;
    earnedPkr: number;
    awaitingPayoutPkr: number;
    paidOutPkr: number;
    pendingFirstPayments: number;
  };
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: partner } = await admin
    .from("partners")
    .select("id, username, email, full_name, status, review_notes, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!partner) return null;

  // Ensure auth metadata stays partner so login/middleware never send them to salon app
  if (user.user_metadata?.account_type !== "partner") {
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        account_type: "partner",
        partner_username: partner.username,
        partner_status: partner.status,
      },
    });
  }

  const [{ data: orgs }, { data: commissions }] = await Promise.all([
    admin
      .from("organizations")
      .select(
        "id, name, slug, city, created_at, subscription_status, trial_ends_at, subscription_ends_at"
      )
      .eq("referred_by_partner_id", partner.id)
      .order("created_at", { ascending: false }),
    admin
      .from("partner_commissions")
      .select(
        "id, amount_pkr, currency, status, created_at, organization_id, subscription_payment_id"
      )
      .eq("partner_id", partner.id)
      .order("created_at", { ascending: false }),
  ]);

  const orgList = orgs ?? [];
  const commissionList = commissions ?? [];
  const byOrg = new Map(
    commissionList.map((c) => [c.organization_id, c] as const)
  );

  const orgIds = orgList.map((o) => o.id);
  const ownerByOrg = new Map<
    string,
    { email: string | null; name: string | null }
  >();

  if (orgIds.length) {
    const { data: members } = await admin
      .from("organization_members")
      .select("organization_id, user_id, role")
      .in("organization_id", orgIds)
      .eq("role", "OWNER");

    await Promise.all(
      (members ?? []).map(async (m) => {
        try {
          const { data: authUser } = await admin.auth.admin.getUserById(m.user_id);
          const meta = authUser.user?.user_metadata ?? {};
          const name =
            (typeof meta.full_name === "string" && meta.full_name) ||
            (typeof meta.salon_name === "string" && meta.salon_name) ||
            null;
          ownerByOrg.set(m.organization_id, {
            email: authUser.user?.email ?? null,
            name,
          });
        } catch {
          ownerByOrg.set(m.organization_id, { email: null, name: null });
        }
      })
    );
  }

  const stores: PartnerReferredStore[] = orgList.map((o) => {
    const c = byOrg.get(o.id);
    const owner = ownerByOrg.get(o.id);
    let referral_phase: PartnerReferredStore["referral_phase"] = "trial";
    if (c?.status === "paid") referral_phase = "paid_out";
    else if (c) referral_phase = "earned";
    else if (
      o.subscription_status === "locked" ||
      o.subscription_status === "grace" ||
      o.subscription_status === "active"
    ) {
      referral_phase = "awaiting_first_payment";
    } else {
      referral_phase = "trial";
    }

    return {
      id: o.id,
      name: o.name,
      slug: o.slug,
      city: o.city,
      created_at: o.created_at,
      subscription_status: o.subscription_status,
      owner_email: owner?.email ?? null,
      owner_name: owner?.name ?? null,
      referral_phase,
      commission_amount_pkr: c ? Number(c.amount_pkr) : null,
      commission_status: c ? (c.status as PartnerReferredStore["commission_status"]) : null,
      commission_at: c?.created_at ?? null,
    };
  });

  const commissionRows: PartnerCommissionRow[] = commissionList.map((c) => {
    const org = orgList.find((o) => o.id === c.organization_id);
    return {
      id: c.id,
      amount_pkr: Number(c.amount_pkr),
      currency: c.currency,
      status: c.status as PartnerCommissionRow["status"],
      created_at: c.created_at,
      organization_id: c.organization_id,
      organization_name: org?.name ?? "Store",
      organization_slug: org?.slug ?? "",
      subscription_payment_id: c.subscription_payment_id,
    };
  });

  const earnedPkr = commissionRows
    .filter((c) => c.status === "earned" || c.status === "paid")
    .reduce((sum, c) => sum + c.amount_pkr, 0);
  const awaitingPayoutPkr = commissionRows
    .filter((c) => c.status === "earned")
    .reduce((sum, c) => sum + c.amount_pkr, 0);
  const paidOutPkr = commissionRows
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + c.amount_pkr, 0);

  return {
    partner: {
      ...partner,
      status: partner.status as PartnerStatus,
    },
    stores,
    commissions: commissionRows,
    totals: {
      referredStores: stores.length,
      earnedPkr,
      awaitingPayoutPkr,
      paidOutPkr,
      pendingFirstPayments: stores.filter((s) => s.commission_amount_pkr == null).length,
    },
  };
}

/** Where to send the user after password login. */
export async function resolvePostLoginDestination(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "/onboarding";

  if (isPlatformAdminEmail(user.email)) return "/platform";

  if (user.user_metadata?.account_type === "customer") {
    return "/shop";
  }

  const admin = createAdminClient();
  const { data: partner } = await admin
    .from("partners")
    .select("id, username, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (partner) {
    if (user.user_metadata?.account_type !== "partner") {
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          account_type: "partner",
          partner_username: partner.username,
          partner_status: partner.status,
        },
      });
    }
    return "/partner/dashboard";
  }

  const { count } = await admin
    .from("organization_members")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) > 0) {
    const { landingPathForProductIntent, parseProductIntent } = await import(
      "@/lib/auth/account-types"
    );
    return landingPathForProductIntent(
      parseProductIntent(user.user_metadata?.product_intent)
    );
  }

  return "/onboarding";
}

export async function listPlatformPartners(): Promise<PartnerRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isPlatformAdminEmail(user.email)) return [];

  const admin = createAdminClient();
  const { data: partners } = await admin
    .from("partners")
    .select(
      "id, user_id, username, email, full_name, phone, status, review_notes, reviewed_at, created_at"
    )
    .order("created_at", { ascending: false });

  if (!partners?.length) return [];

  const ids = partners.map((p) => p.id);
  const [{ data: orgs }, { data: commissions }] = await Promise.all([
    admin
      .from("organizations")
      .select("id, referred_by_partner_id")
      .in("referred_by_partner_id", ids),
    admin
      .from("partner_commissions")
      .select("partner_id, amount_pkr, status")
      .in("partner_id", ids),
  ]);

  const storeCount = new Map<string, number>();
  for (const o of orgs ?? []) {
    if (!o.referred_by_partner_id) continue;
    storeCount.set(
      o.referred_by_partner_id,
      (storeCount.get(o.referred_by_partner_id) ?? 0) + 1
    );
  }

  const earned = new Map<string, number>();
  for (const c of commissions ?? []) {
    if (c.status === "void") continue;
    earned.set(c.partner_id, (earned.get(c.partner_id) ?? 0) + Number(c.amount_pkr));
  }

  return partners.map((p) => ({
    id: p.id,
    user_id: p.user_id,
    username: p.username,
    email: p.email,
    full_name: p.full_name,
    phone: p.phone,
    status: p.status as PartnerStatus,
    review_notes: p.review_notes,
    reviewed_at: p.reviewed_at,
    created_at: p.created_at,
    referredStoreCount: storeCount.get(p.id) ?? 0,
    earnedTotalPkr: earned.get(p.id) ?? 0,
  }));
}

export async function reviewPartnerApplication(input: {
  partnerId: string;
  decision: "approved" | "rejected";
  reviewNotes?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isPlatformAdminEmail(user.email)) {
    return { error: "Only platform admins can review partners" };
  }

  const admin = createAdminClient();
  const { data: partner, error } = await admin
    .from("partners")
    .select("id, status, user_id, username, email, full_name")
    .eq("id", input.partnerId)
    .single();

  if (error || !partner) return { error: "Partner not found" };
  if (partner.status !== "pending") return { error: "Application already reviewed" };

  const now = new Date().toISOString();
  const reviewNotes =
    input.reviewNotes?.trim() ||
    (input.decision === "approved"
      ? "Approved — referral link is live"
      : "Rejected");

  const { error: upd } = await admin
    .from("partners")
    .update({
      status: input.decision,
      reviewed_by: user.id,
      reviewed_at: now,
      review_notes: reviewNotes,
    })
    .eq("id", partner.id);

  if (upd) return { error: upd.message };

  if (partner.user_id) {
    const { data: authUser } = await admin.auth.admin.getUserById(partner.user_id);
    if (authUser.user) {
      await admin.auth.admin.updateUserById(partner.user_id, {
        user_metadata: {
          ...authUser.user.user_metadata,
          account_type: "partner",
          partner_username: partner.username,
          partner_status: input.decision,
        },
      });
    }
  }

  try {
    const { sendPartnerReviewEmail } = await import("@/lib/email/notify");
    await sendPartnerReviewEmail({
      email: partner.email,
      username: partner.username,
      fullName: partner.full_name,
      status: input.decision,
      notes: reviewNotes,
      partnerId: partner.id,
    });
  } catch (err) {
    console.error("[partners] review email failed", err);
  }

  revalidatePath("/platform");
  revalidatePath("/partner/dashboard");
  return { success: true };
}

/**
 * Credit partner with the full first approved subscription for a referred store.
 * Safe to call multiple times — unique constraints prevent double credit.
 * Source of truth today: manual JazzCash approval in reviewSubscriptionPayment.
 * Future gateways can call this same helper after a successful charge.
 */
export async function creditPartnerFirstSubscription(input: {
  organizationId: string;
  paymentId: string;
  amountPkr: number;
}): Promise<void> {
  const admin = createAdminClient();

  const { data: org } = await admin
    .from("organizations")
    .select("id, referred_by_partner_id, name")
    .eq("id", input.organizationId)
    .maybeSingle();

  if (!org?.referred_by_partner_id) return;

  const { data: partner } = await admin
    .from("partners")
    .select("id, status, email, user_id")
    .eq("id", org.referred_by_partner_id)
    .maybeSingle();

  if (!partner || partner.status !== "approved") return;

  // Block self-referral payout (partner email / auth user owns the store)
  const { data: owners } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", org.id)
    .eq("role", "OWNER")
    .limit(1);
  const ownerId = owners?.[0]?.user_id ?? null;
  if (ownerId && partner.user_id && ownerId === partner.user_id) {
    console.warn("[partners] skipped self-referral commission", {
      organizationId: org.id,
      partnerId: partner.id,
    });
    return;
  }
  if (ownerId) {
    const { data: ownerUser } = await admin.auth.admin.getUserById(ownerId);
    const ownerEmail = ownerUser.user?.email?.toLowerCase() ?? "";
    if (ownerEmail && ownerEmail === String(partner.email).toLowerCase()) {
      console.warn("[partners] skipped self-referral commission (email)", {
        organizationId: org.id,
        partnerId: partner.id,
      });
      return;
    }
  }

  // Only the first approved payment for this org earns commission
  const { count } = await admin
    .from("subscription_payments")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", org.id)
    .eq("status", "approved")
    .neq("id", input.paymentId);

  if ((count ?? 0) > 0) return;

  const amount =
    Number.isFinite(input.amountPkr) && input.amountPkr > 0
      ? input.amountPkr
      : SUBSCRIPTION.monthlyAmountPkr;

  const { error } = await admin.from("partner_commissions").insert({
    partner_id: partner.id,
    organization_id: org.id,
    subscription_payment_id: input.paymentId,
    amount_pkr: amount,
    currency: "PKR",
    status: "earned",
    notes: `First subscription for ${org.name} — full amount credited to partner`,
  });

  // Unique violation = already credited; ignore
  if (error && !/unique|duplicate/i.test(error.message)) {
    console.error("partner commission insert failed", error.message);
  }

  revalidatePath("/partner/dashboard");
  revalidatePath("/platform");
}

/** Platform admin: mark an earned commission as manually paid out to the partner. */
export async function markPartnerCommissionPaid(
  commissionId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isPlatformAdminEmail(user.email)) {
    return { error: "Only platform admins can mark partner payouts" };
  }

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("partner_commissions")
    .select("id, status")
    .eq("id", commissionId)
    .single();

  if (error || !row) return { error: "Commission not found" };
  if (row.status === "paid") return { success: true };
  if (row.status !== "earned") return { error: "Only earned commissions can be paid out" };

  const { error: upd } = await admin
    .from("partner_commissions")
    .update({
      status: "paid",
      notes: "Marked paid manually by platform admin",
    })
    .eq("id", commissionId);

  if (upd) return { error: upd.message };

  revalidatePath("/partner/dashboard");
  revalidatePath("/platform");
  return { success: true };
}

export async function checkPartnerUsernameAvailable(raw: string): Promise<{
  available: boolean;
  error?: string;
}> {
  const validated = validatePartnerUsername(raw);
  if (!validated.ok) return { available: false, error: validated.error };

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("partners")
      .select("id")
      .eq("username", validated.username)
      .maybeSingle();
    if (data) return { available: false, error: "This username is already taken" };
    return { available: true };
  } catch (err) {
    return {
      available: false,
      error: err instanceof Error ? err.message : "Could not check username",
    };
  }
}

export { normalizePartnerUsername };
