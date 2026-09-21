import { SUBSCRIPTION } from "@/lib/billing/subscription";
import { escapeHtml } from "@/lib/email/escape";
import { renderEmailLayout } from "@/lib/email/layout";
import { SYNCOPS } from "@/lib/print/syncops";

const PRICE = `$${SUBSCRIPTION.asiaAmountUsd}–$${SUBSCRIPTION.usdtAmountUsd}`;

export function salonWelcomeVerifyEmail(input: {
  name: string;
  salonName: string;
  verifyUrl: string;
  expiresHours?: number;
}) {
  const name = escapeHtml(input.name || "there");
  const salon = escapeHtml(input.salonName);
  const hours = input.expiresHours ?? 24;

  return {
    subject: `Welcome to ${SYNCOPS.name} — verify your email`,
    ...renderEmailLayout({
      preheader: `Verify your email to activate ${input.salonName} on Beautora.`,
      title: "Verify your email",
      bodyHtml: `
        <p style="margin:0 0 12px;">Hi ${name},</p>
        <p style="margin:0 0 12px;">Welcome to <strong>${escapeHtml(SYNCOPS.name)}</strong>. Your store <strong>${salon}</strong> is almost ready.</p>
        <p style="margin:0 0 12px;">Click the button below to verify your email and continue onboarding. This link expires in about <strong>${hours} hours</strong>.</p>
        <p style="margin:0;font-size:13px;color:#6B7672;">If you didn’t create this account, you can ignore this email.</p>
      `,
      ctaLabel: "Verify email & continue",
      ctaUrl: input.verifyUrl,
      footerNote:
        "For your security, never share this link. Beautora will never ask for your password by email.",
    }),
  };
}

export function customerWelcomeVerifyEmail(input: {
  name?: string | null;
  verifyUrl: string;
  expiresHours?: number;
}) {
  const name = escapeHtml(input.name || "there");
  const hours = input.expiresHours ?? 24;

  return {
    subject: `Welcome to ${SYNCOPS.name} Marketplace — verify your email`,
    ...renderEmailLayout({
      preheader: "Verify your email to shop on Beautora Marketplace.",
      title: "Verify your email",
      bodyHtml: `
        <p style="margin:0 0 12px;">Hi ${name},</p>
        <p style="margin:0 0 12px;">Welcome to <strong>${escapeHtml(SYNCOPS.name)} Marketplace</strong>. Verify your email to sign in, add products to your cart, and place COD orders.</p>
        <p style="margin:0 0 12px;">This link expires in about <strong>${hours} hours</strong>.</p>
        <p style="margin:0;font-size:13px;color:#6B7672;">If you didn’t create this account, you can ignore this email.</p>
      `,
      ctaLabel: "Verify email & shop",
      ctaUrl: input.verifyUrl,
      footerNote:
        "For your security, never share this link. Beautora will never ask for your password by email.",
    }),
  };
}

export function partnerWelcomeVerifyEmail(input: {
  name: string;
  username: string;
  verifyUrl: string;
  expiresHours?: number;
}) {
  const name = escapeHtml(input.name || "there");
  const username = escapeHtml(input.username);
  const hours = input.expiresHours ?? 24;

  return {
    subject: `Welcome to ${SYNCOPS.name} Partners — verify your account`,
    ...renderEmailLayout({
      preheader: "Verify your partner account and wait for SyncOps approval.",
      title: "Verify your partner account",
      bodyHtml: `
        <p style="margin:0 0 12px;">Hi ${name},</p>
        <p style="margin:0 0 12px;">Thanks for applying to the <strong>${escapeHtml(SYNCOPS.name)}</strong> partner program as <strong>@${username}</strong>.</p>
        <p style="margin:0 0 12px;">Verify your email first. After SyncOps reviews your application, you can share your referral link and earn the first month (${PRICE}) when a referred salon pays.</p>
        <p style="margin:0 0 12px;">This verification link expires in about <strong>${hours} hours</strong>.</p>
        <p style="margin:0;font-size:13px;color:#6B7672;">If you didn’t apply, ignore this email.</p>
      `,
      ctaLabel: "Verify partner email",
      ctaUrl: input.verifyUrl,
      footerNote:
        "Partner applications stay pending until SyncOps approves them. Verification does not mean approval.",
    }),
  };
}

export function partnerStatusEmail(input: {
  name: string;
  username: string;
  status: "approved" | "rejected";
  notes?: string | null;
  dashboardUrl: string;
}) {
  const name = escapeHtml(input.name || "there");
  const username = escapeHtml(input.username);
  const approved = input.status === "approved";
  const notes = input.notes?.trim()
    ? `<p style="margin:12px 0 0;padding:12px;background:#F5F6F3;border-radius:8px;font-size:13px;">${escapeHtml(input.notes.trim())}</p>`
    : "";

  return {
    subject: approved
      ? `Your ${SYNCOPS.name} partner account is approved`
      : `Update on your ${SYNCOPS.name} partner application`,
    ...renderEmailLayout({
      preheader: approved
        ? "You’re approved — open your partner dashboard."
        : "Your partner application was not approved.",
      title: approved ? "You’re approved" : "Application update",
      bodyHtml: `
        <p style="margin:0 0 12px;">Hi ${name},</p>
        <p style="margin:0 0 12px;">Your partner account <strong>@${username}</strong> was <strong>${approved ? "approved" : "not approved"}</strong>.</p>
        ${notes}
        ${
          approved
            ? `<p style="margin:12px 0 0;">Open your dashboard to copy your referral link and track commissions.</p>`
            : `<p style="margin:12px 0 0;">You can reply to support if you have questions.</p>`
        }
      `,
      ctaLabel: approved ? "Open partner dashboard" : "Contact support",
      ctaUrl: approved ? input.dashboardUrl : `mailto:${SYNCOPS.email}`,
    }),
  };
}

export function passwordResetEmail(input: {
  name?: string | null;
  resetUrl: string;
  expiresHours?: number;
}) {
  const name = escapeHtml(input.name || "there");
  const hours = input.expiresHours ?? 1;

  return {
    subject: `Reset your ${SYNCOPS.name} password`,
    ...renderEmailLayout({
      preheader: "Use this secure link to choose a new password.",
      title: "Reset your password",
      bodyHtml: `
        <p style="margin:0 0 12px;">Hi ${name},</p>
        <p style="margin:0 0 12px;">We received a request to reset your Beautora password. Click below to choose a new one. This link expires in about <strong>${hours} hour${hours === 1 ? "" : "s"}</strong>.</p>
        <p style="margin:0;font-size:13px;color:#6B7672;">If you didn’t request this, you can safely ignore this email — your password will stay the same.</p>
      `,
      ctaLabel: "Reset password",
      ctaUrl: input.resetUrl,
      footerNote:
        "Never share this link. Beautora will never email you a password.",
    }),
  };
}

export function teamInviteEmail(input: {
  salonName: string;
  roleLabel: string;
  inviteUrl: string;
  expiresDays?: number;
}) {
  const salon = escapeHtml(input.salonName);
  const role = escapeHtml(input.roleLabel);
  const days = input.expiresDays ?? 7;

  return {
    subject: `You're invited to join ${input.salonName} on ${SYNCOPS.name}`,
    ...renderEmailLayout({
      preheader: `Accept your ${input.roleLabel} invite for ${input.salonName}.`,
      title: "You're invited to the team",
      bodyHtml: `
        <p style="margin:0 0 12px;">Hello,</p>
        <p style="margin:0 0 12px;"><strong>${salon}</strong> invited you to join Beautora as <strong>${role}</strong>.</p>
        <p style="margin:0 0 12px;">Click the button below to accept the invite and create your own secure password. This link expires in about <strong>${days} days</strong>.</p>
        <p style="margin:0;font-size:13px;color:#6B7672;">If you weren’t expecting this invite, you can ignore this email.</p>
      `,
      ctaLabel: "Accept invite & create account",
      ctaUrl: input.inviteUrl,
      footerNote:
        "This is a private team invite. Beautora will never ask for your password by email.",
    }),
  };
}

export function subscriptionActivatedEmail(input: {
  name: string;
  storeName: string;
  amountLabel: string;
  activatedAt: string;
  renewsAt: string;
  dashboardUrl: string;
}) {
  return {
    subject: `Your ${SYNCOPS.name} Subscription is Active`,
    ...renderEmailLayout({
      preheader: `${input.storeName} is active for another billing period.`,
      title: "Subscription active",
      bodyHtml: `
        <p style="margin:0 0 12px;">Hi ${escapeHtml(input.name)},</p>
        <p style="margin:0 0 12px;">Payment for <strong>${escapeHtml(input.storeName)}</strong> was approved. Your subscription is <strong>active</strong>.</p>
        <ul style="margin:0 0 12px;padding-left:18px;">
          <li>Plan: Monthly store subscription</li>
          <li>Amount: ${escapeHtml(input.amountLabel)}</li>
          <li>Activated: ${escapeHtml(input.activatedAt)}</li>
          <li>Renews / valid until: ${escapeHtml(input.renewsAt)}</li>
          <li>Status: Active</li>
        </ul>
        <p style="margin:0;">Open your dashboard to keep running bookings, POS, and staff tools.</p>
      `,
      ctaLabel: "Open dashboard",
      ctaUrl: input.dashboardUrl,
    }),
  };
}

export function subscriptionDeactivatedEmail(input: {
  name: string;
  storeName: string;
  reason: "cancelled" | "locked" | "expired";
  effectiveAt: string;
  billingUrl: string;
}) {
  const label =
    input.reason === "cancelled"
      ? "cancelled"
      : input.reason === "expired"
        ? "ended"
        : "locked";

  return {
    subject:
      input.reason === "cancelled"
        ? `Your ${SYNCOPS.name} Subscription Has Been Cancelled`
        : `Your ${SYNCOPS.name} Subscription Has Ended`,
    ...renderEmailLayout({
      preheader: `${input.storeName} access is ${label}.`,
      title: `Subscription ${label}`,
      bodyHtml: `
        <p style="margin:0 0 12px;">Hi ${escapeHtml(input.name)},</p>
        <p style="margin:0 0 12px;">Access for <strong>${escapeHtml(input.storeName)}</strong> is now <strong>${escapeHtml(label)}</strong> (effective ${escapeHtml(input.effectiveAt)}).</p>
        <p style="margin:0 0 12px;">You can renew from Billing whenever you’re ready — upload your USDT payment proof for review.</p>
      `,
      ctaLabel: "Go to billing",
      ctaUrl: input.billingUrl,
    }),
  };
}

export function platformPaymentSubmittedEmail(input: {
  storeName: string;
  amountLabel: string;
  methodLabel: string;
  destination: string;
  transactionRef: string;
  platformUrl: string;
}) {
  return {
    subject: `[Beautora] Payment proof — ${input.storeName}`,
    ...renderEmailLayout({
      preheader: `${input.storeName} submitted ${input.amountLabel} via ${input.methodLabel}.`,
      title: "New subscription payment proof",
      bodyHtml: `
        <p style="margin:0 0 12px;">A salon submitted payment proof for review.</p>
        <ul style="margin:0 0 12px;padding-left:18px;">
          <li>Store: <strong>${escapeHtml(input.storeName)}</strong></li>
          <li>Method: ${escapeHtml(input.methodLabel)}</li>
          <li>Amount: ${escapeHtml(input.amountLabel)}</li>
          <li>Destination: ${escapeHtml(input.destination)}</li>
          <li>Reference: ${escapeHtml(input.transactionRef)}</li>
        </ul>
        <p style="margin:0;">Open Platform admin to approve or reject and unlock the store.</p>
      `,
      ctaLabel: "Review in Platform admin",
      ctaUrl: input.platformUrl,
    }),
  };
}

export function marketplaceOrderInvoiceEmail(input: {
  buyerName: string;
  orderNumber: string;
  totalLabel: string;
  paymentMethod: string;
  paymentStatus: string;
  linesHtml: string;
  shopUrl: string;
}) {
  const name = escapeHtml(input.buyerName || "there");
  return {
    subject: `Beautora Marketplace invoice · ${input.orderNumber}`,
    ...renderEmailLayout({
      preheader: `Invoice for order ${input.orderNumber} · ${input.totalLabel}`,
      title: "Your marketplace invoice",
      bodyHtml: `
        <p style="margin:0 0 12px;">Hi ${name},</p>
        <p style="margin:0 0 12px;">Thanks for shopping on <strong>Beautora Marketplace</strong>. Here is your invoice.</p>
        <ul style="margin:0 0 12px;padding-left:18px;">
          <li>Order: <strong>${escapeHtml(input.orderNumber)}</strong></li>
          <li>Payment: ${escapeHtml(input.paymentMethod)} · ${escapeHtml(input.paymentStatus)}</li>
          <li>Total: <strong>${escapeHtml(input.totalLabel)}</strong></li>
        </ul>
        <div style="margin:0 0 12px;padding:12px;border:1px solid #E6EBE9;border-radius:8px;">
          ${input.linesHtml}
        </div>
        <p style="margin:0;font-size:13px;color:#6B7672;">Keep this email for your records. For COD orders, pay the courier when delivered.</p>
      `,
      ctaLabel: "View shop",
      ctaUrl: input.shopUrl,
      footerNote: "This invoice is for Beautora Marketplace only — separate from salon POS receipts.",
    }),
  };
}

export function marketplacePaymentReceiptEmail(input: {
  buyerName: string;
  orderNumber: string;
  totalLabel: string;
  shopUrl: string;
}) {
  const name = escapeHtml(input.buyerName || "there");
  return {
    subject: `Payment received · ${input.orderNumber}`,
    ...renderEmailLayout({
      preheader: `We received ${input.totalLabel} for order ${input.orderNumber}.`,
      title: "Payment confirmed",
      bodyHtml: `
        <p style="margin:0 0 12px;">Hi ${name},</p>
        <p style="margin:0 0 12px;">Your card / online payment for order <strong>${escapeHtml(input.orderNumber)}</strong> was received successfully.</p>
        <p style="margin:0 0 12px;">Amount paid: <strong>${escapeHtml(input.totalLabel)}</strong></p>
        <p style="margin:0;font-size:13px;color:#6B7672;">A detailed invoice was also sent to this email. Contact the seller via Beautora if you need help with delivery.</p>
      `,
      ctaLabel: "Continue shopping",
      ctaUrl: input.shopUrl,
    }),
  };
}
