export const EmailType = {
  SalonWelcomeVerify: "salon_welcome_verify",
  PartnerWelcomeVerify: "partner_welcome_verify",
  PartnerApproved: "partner_approved",
  PartnerRejected: "partner_rejected",
  PasswordReset: "password_reset",
  SubscriptionActivated: "subscription_activated",
  SubscriptionDeactivated: "subscription_deactivated",
  PlatformPaymentSubmitted: "platform_payment_submitted",
  TeamInvite: "team_invite",
} as const;

export type EmailType = (typeof EmailType)[keyof typeof EmailType];

export type SendEmailInput = {
  to: string;
  toName?: string | null;
  subject: string;
  html: string;
  text: string;
  type: EmailType;
  /** Optional Reply-To override */
  replyTo?: string;
  /** Idempotency key for Resend (and our own dedupe) */
  idempotencyKey?: string;
};

export type SendEmailResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; skipped?: boolean };
