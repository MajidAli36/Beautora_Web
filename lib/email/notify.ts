import { generateAuthActionLink } from "@/lib/email/auth-links";
import { getEmailLinkBaseUrl } from "@/lib/email/config";
import { sendTransactionalEmail } from "@/lib/email/send";
import {
  partnerStatusEmail,
  partnerWelcomeVerifyEmail,
  passwordResetEmail,
  salonWelcomeVerifyEmail,
  subscriptionActivatedEmail,
  subscriptionDeactivatedEmail,
  teamInviteEmail,
} from "@/lib/email/templates";
import { EmailType } from "@/lib/email/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUBSCRIPTION } from "@/lib/billing/subscription";

/** Fire-and-forget safe: never throws. */
export async function sendSalonSignupVerificationEmail(input: {
  email: string;
  salonName: string;
  userId?: string;
}) {
  const link = await generateAuthActionLink({
    email: input.email,
    type: "magiclink",
    nextPath: "/onboarding",
  });
  if (!link.ok) {
    console.error("[email] salon verify link failed", { message: link.error });
    return { ok: false as const, error: link.error };
  }

  const content = salonWelcomeVerifyEmail({
    name: input.salonName,
    salonName: input.salonName,
    verifyUrl: link.actionLink,
  });

  return sendTransactionalEmail({
    to: input.email,
    toName: input.salonName,
    subject: content.subject,
    html: content.html,
    text: content.text,
    type: EmailType.SalonWelcomeVerify,
    idempotencyKey: input.userId
      ? `salon-verify:${input.userId}:${Math.floor(Date.now() / 60_000)}`
      : `salon-verify:${input.email}:${Math.floor(Date.now() / 60_000)}`,
  });
}

export async function sendPartnerSignupVerificationEmail(input: {
  email: string;
  username: string;
  fullName?: string | null;
  userId?: string;
}) {
  const link = await generateAuthActionLink({
    email: input.email,
    type: "magiclink",
    nextPath: "/partner/dashboard",
  });
  if (!link.ok) {
    console.error("[email] partner verify link failed", { message: link.error });
    return { ok: false as const, error: link.error };
  }

  const content = partnerWelcomeVerifyEmail({
    name: input.fullName || input.username,
    username: input.username,
    verifyUrl: link.actionLink,
  });

  return sendTransactionalEmail({
    to: input.email,
    toName: input.fullName || input.username,
    subject: content.subject,
    html: content.html,
    text: content.text,
    type: EmailType.PartnerWelcomeVerify,
    idempotencyKey: input.userId
      ? `partner-verify:${input.userId}:${Math.floor(Date.now() / 60_000)}`
      : `partner-verify:${input.email}:${Math.floor(Date.now() / 60_000)}`,
  });
}

export async function sendPartnerReviewEmail(input: {
  email: string;
  username: string;
  fullName?: string | null;
  status: "approved" | "rejected";
  notes?: string | null;
  partnerId: string;
}) {
  const content = partnerStatusEmail({
    name: input.fullName || input.username,
    username: input.username,
    status: input.status,
    notes: input.notes,
    dashboardUrl: `${getEmailLinkBaseUrl()}/partner/dashboard`,
  });

  return sendTransactionalEmail({
    to: input.email,
    toName: input.fullName || input.username,
    subject: content.subject,
    html: content.html,
    text: content.text,
    type:
      input.status === "approved"
        ? EmailType.PartnerApproved
        : EmailType.PartnerRejected,
    idempotencyKey: `partner-${input.status}:${input.partnerId}`,
  });
}

export async function sendPasswordResetEmail(input: {
  email: string;
  name?: string | null;
}) {
  const link = await generateAuthActionLink({
    email: input.email,
    type: "recovery",
    nextPath: "/reset-password",
  });
  if (!link.ok) {
    // Anti-enumeration: caller still returns generic success to the user.
    console.error("[email] password reset link failed", { message: link.error });
    return { ok: false as const, error: link.error };
  }

  const content = passwordResetEmail({
    name: input.name,
    resetUrl: link.actionLink,
  });

  return sendTransactionalEmail({
    to: input.email,
    toName: input.name,
    subject: content.subject,
    html: content.html,
    text: content.text,
    type: EmailType.PasswordReset,
    idempotencyKey: `password-reset:${input.email}:${Math.floor(Date.now() / 60_000)}`,
  });
}

export async function sendTeamInviteEmail(input: {
  email: string;
  salonName: string;
  role: string;
  roleLabel: string;
  inviteToken: string;
  inviteId: string;
  expiresDays?: number;
}) {
  const inviteUrl = `${getEmailLinkBaseUrl()}/invite/${encodeURIComponent(input.inviteToken)}`;
  const content = teamInviteEmail({
    salonName: input.salonName,
    roleLabel: input.roleLabel,
    inviteUrl,
    expiresDays: input.expiresDays,
  });

  return sendTransactionalEmail({
    to: input.email,
    toName: input.email.split("@")[0],
    subject: content.subject,
    html: content.html,
    text: content.text,
    type: EmailType.TeamInvite,
    idempotencyKey: `team-invite:${input.inviteId}:${Math.floor(Date.now() / 60_000)}`,
  });
}

export async function sendSubscriptionActivatedEmail(input: {
  organizationId: string;
  paymentId: string;
  amount: number;
  renewsAt: string;
}) {
  const owner = await getOrganizationOwnerContact(input.organizationId);
  if (!owner?.email) {
    console.warn("[email] no owner email for subscription activated", {
      organizationId: input.organizationId,
    });
    return { ok: false as const, error: "No owner email", skipped: true };
  }

  const amountLabel = `${SUBSCRIPTION.currencyLabel} ${Number(input.amount).toLocaleString("en-PK")}`;
  const content = subscriptionActivatedEmail({
    name: owner.name,
    storeName: owner.storeName,
    amountLabel,
    activatedAt: new Date().toLocaleDateString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    renewsAt: new Date(input.renewsAt).toLocaleDateString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    dashboardUrl: `${getEmailLinkBaseUrl()}/dashboard`,
  });

  return sendTransactionalEmail({
    to: owner.email,
    toName: owner.name,
    subject: content.subject,
    html: content.html,
    text: content.text,
    type: EmailType.SubscriptionActivated,
    idempotencyKey: `sub-activated:${input.paymentId}`,
  });
}

export async function sendSubscriptionDeactivatedEmail(input: {
  organizationId: string;
  reason: "cancelled" | "locked" | "expired";
  eventKey: string;
}) {
  const owner = await getOrganizationOwnerContact(input.organizationId);
  if (!owner?.email) {
    return { ok: false as const, error: "No owner email", skipped: true };
  }

  const content = subscriptionDeactivatedEmail({
    name: owner.name,
    storeName: owner.storeName,
    reason: input.reason,
    effectiveAt: new Date().toLocaleDateString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    billingUrl: `${getEmailLinkBaseUrl()}/billing`,
  });

  return sendTransactionalEmail({
    to: owner.email,
    toName: owner.name,
    subject: content.subject,
    html: content.html,
    text: content.text,
    type: EmailType.SubscriptionDeactivated,
    idempotencyKey: `sub-deactivated:${input.eventKey}`,
  });
}

async function getOrganizationOwnerContact(organizationId: string): Promise<{
  email: string;
  name: string;
  storeName: string;
} | null> {
  try {
    const admin = createAdminClient();
    const { data: org } = await admin
      .from("organizations")
      .select("id, name")
      .eq("id", organizationId)
      .maybeSingle();
    if (!org) return null;

    const { data: member } = await admin
      .from("organization_members")
      .select("user_id, role")
      .eq("organization_id", organizationId)
      .eq("role", "OWNER")
      .limit(1)
      .maybeSingle();

    if (!member?.user_id) return null;

    const { data: userData, error } = await admin.auth.admin.getUserById(
      member.user_id
    );
    if (error || !userData.user?.email) return null;

    const meta = userData.user.user_metadata ?? {};
    const name =
      (typeof meta.full_name === "string" && meta.full_name) ||
      (typeof meta.salon_name === "string" && meta.salon_name) ||
      org.name;

    return {
      email: userData.user.email,
      name,
      storeName: org.name,
    };
  } catch (err) {
    console.error("[email] owner lookup failed", err);
    return null;
  }
}
