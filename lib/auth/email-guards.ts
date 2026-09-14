import { createHash, randomBytes } from "node:crypto";
import type { createAdminClient } from "@/lib/supabase/admin";
import { isHardcodedPlatformAdminEmail } from "@/lib/platform/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export type EmailIntent =
  | "salon_signup"
  | "customer_signup"
  | "partner_apply"
  | "team_invite";

export type AuthAccountKind =
  | "platform_admin"
  | "partner"
  | "staff"
  | "owner"
  | "customer"
  | "unknown";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function classifyAuthMetadata(
  meta: Record<string, unknown> | null | undefined,
  email?: string | null
): AuthAccountKind {
  if (isHardcodedPlatformAdminEmail(email)) return "platform_admin";
  if (!meta) return "unknown";
  const type = typeof meta.account_type === "string" ? meta.account_type : "";
  if (type === "platform_admin") return "platform_admin";
  if (type === "partner") return "partner";
  if (type === "customer") return "customer";
  if (
    type === "staff" ||
    meta.created_by_admin === true ||
    Boolean(meta.salon_role)
  ) {
    return "staff";
  }
  if (type === "owner") return "owner";
  return "unknown";
}

export async function findAuthUserByEmail(admin: AdminClient, email: string) {
  const target = normalizeEmail(email);
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw new Error(error.message);
    const found = data.users.find((u) => u.email?.toLowerCase() === target);
    if (found) return found;
    if (data.users.length < 200) break;
  }
  return null;
}

function messageForExistingAccount(
  kind: AuthAccountKind,
  intent: EmailIntent
): string {
  if (kind === "partner") {
    if (intent === "salon_signup" || intent === "customer_signup") {
      return "This email is registered as a Beautora partner. Partners cannot open a salon or shopper account with the same email — use a different email, or sign in to the partner portal.";
    }
    if (intent === "team_invite") {
      return "This email belongs to a partner account and cannot be invited as salon staff.";
    }
    return "A partner application already exists for this email.";
  }

  if (kind === "staff") {
    if (intent === "salon_signup" || intent === "customer_signup") {
      return "This email is already a staff login for a salon. Sign in with your invite credentials — you cannot open a new store or shopper account with this email.";
    }
    if (intent === "partner_apply") {
      return "This email is already a salon staff login. Staff accounts cannot register as partners — use a different email.";
    }
    return "This email is already a staff login.";
  }

  if (kind === "customer") {
    if (intent === "salon_signup") {
      return "This email is already a Marketplace shopper account. Sign in to shop, or use a different email to open a salon.";
    }
    if (intent === "partner_apply") {
      return "This email is already a shopper account. Use a different email for partner registration.";
    }
    if (intent === "team_invite") {
      return "This email is a shopper account and cannot be invited as salon staff. Use a different email.";
    }
    return "An account with this email already exists. Please sign in.";
  }

  if (kind === "owner") {
    if (intent === "customer_signup") {
      return "This email already owns a salon account. Sign in to your salon, or use a different email to shop.";
    }
    if (intent === "partner_apply") {
      return "This email already owns a salon account. Salon owners cannot register as partners with the same email.";
    }
    if (intent === "team_invite") {
      return "This email already owns a salon and cannot be invited as staff. Use a different email.";
    }
    return "An account with this email already exists. Please sign in.";
  }

  if (kind === "platform_admin") {
    return "This email is reserved and cannot be used.";
  }

  return "An account with this email already exists. Please sign in.";
}

/**
 * Full email protection across salon signup, partner apply, and staff invites.
 * Returns an error message when the email must not be used for `intent`.
 */
export async function getEmailBlockReason(
  admin: AdminClient,
  emailInput: string,
  intent: EmailIntent
): Promise<string | null> {
  const email = normalizeEmail(emailInput);
  if (!email || !email.includes("@")) return "Enter a valid email address";

  if (isHardcodedPlatformAdminEmail(email)) {
    return "This email is reserved and cannot be used.";
  }

  const existing = await findAuthUserByEmail(admin, email);
  if (existing) {
    const kind = classifyAuthMetadata(
      existing.user_metadata as Record<string, unknown>,
      existing.email
    );

    // Team invite: existing staff may join another salon via accept flow.
    if (intent === "team_invite" && kind === "staff") {
      // still check partner table below; allow continuing
    } else {
      return messageForExistingAccount(kind, intent);
    }
  }

  const { data: partner } = await admin
    .from("partners")
    .select("id, status")
    .ilike("email", email)
    .maybeSingle();

  if (partner) {
    if (intent === "salon_signup" || intent === "customer_signup") {
      return "This email is registered as a Beautora partner. Use a different email.";
    }
    if (intent === "team_invite") {
      return "This email belongs to a partner and cannot be invited as salon staff.";
    }
    if (intent === "partner_apply") {
      return "A partner application already exists for this email.";
    }
  }

  const { data: pendingInvite } = await admin
    .from("team_invitations")
    .select("id, organization_id")
    .eq("email", email)
    .eq("status", "pending")
    .maybeSingle();

  if (pendingInvite) {
    if (intent === "salon_signup" || intent === "customer_signup") {
      return "This email was invited to a salon team. Accept the invite from your email — you cannot open a new store or shopper account with it.";
    }
    if (intent === "partner_apply") {
      return "This email was invited to a salon team. Accept that invite or use a different email for partner registration.";
    }
    // team_invite: caller handles same-org vs other-org
  }

  return null;
}

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createInviteToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashInviteToken(token) };
}

export const TEAM_INVITE_TTL_DAYS = 7;
