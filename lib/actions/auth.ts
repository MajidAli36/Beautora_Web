"use server";

import {
  classifyAuthMetadata,
  findAuthUserByEmail,
  getEmailBlockReason,
  normalizeEmail,
  type EmailIntent,
} from "@/lib/auth/email-guards";
import {
  parseSignupAccountType,
  type SignupAccountType,
} from "@/lib/auth/account-types";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendCustomerSignupVerificationEmail,
  sendCustomerWelcomeReadyEmail,
  sendPasswordResetEmail,
  sendSalonSignupVerificationEmail,
  sendSalonWelcomeReadyEmail,
} from "@/lib/email/notify";
import type { ActionResult } from "@/types/commerce";

function normalizeSalonName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

async function salonNameTaken(
  admin: ReturnType<typeof createAdminClient>,
  salonName: string
) {
  const target = normalizeSalonName(salonName).toLowerCase();
  const { data, error } = await admin.from("organizations").select("id, name");
  if (error) throw new Error(error.message);
  return (data ?? []).some((o) => o.name.trim().toLowerCase() === target);
}

export async function checkEmailAvailable(
  emailInput: string,
  intent: EmailIntent = "salon_signup"
): Promise<{
  available: boolean;
  error?: string;
}> {
  const email = normalizeEmail(emailInput);
  if (!email || !email.includes("@")) {
    return { available: false, error: "Enter a valid email" };
  }

  try {
    const admin = createAdminClient();
    const blocked = await getEmailBlockReason(admin, email, intent);
    if (blocked) return { available: false, error: blocked };
    return { available: true };
  } catch (err) {
    return {
      available: false,
      error: err instanceof Error ? err.message : "Could not check email",
    };
  }
}

export async function checkSalonNameAvailable(nameInput: string): Promise<{
  available: boolean;
  error?: string;
}> {
  const salonName = normalizeSalonName(nameInput);
  if (salonName.length < 2) {
    return { available: false, error: "Salon name must be at least 2 characters" };
  }

  try {
    const admin = createAdminClient();
    const taken = await salonNameTaken(admin, salonName);
    if (taken) {
      return {
        available: false,
        error: "This salon name is already taken. Choose a different name.",
      };
    }
    return { available: true };
  } catch (err) {
    return {
      available: false,
      error: err instanceof Error ? err.message : "Could not check salon name",
    };
  }
}

/**
 * Creates an auth user (email unconfirmed) and sends Beautora verification email via Resend.
 * - Salon owners → verify → /onboarding (product intent + store setup)
 * - Customers / shoppers → verify → /shop (login required to add to cart)
 */
export async function registerAccount(input: {
  email: string;
  password: string;
  /** Required for salon owners */
  salonName?: string;
  /** Display name for shoppers */
  fullName?: string;
  accountType: SignupAccountType;
  /** Approved partner username from ?ref= (owners only) */
  referralCode?: string | null;
}): Promise<ActionResult & { needsEmailVerification?: boolean }> {
  const email = normalizeEmail(input.email);
  const password = input.password;
  const accountType = parseSignupAccountType(input.accountType);
  const salonName = normalizeSalonName(input.salonName ?? "");
  const fullName = (input.fullName ?? "").trim().replace(/\s+/g, " ");

  if (!accountType) {
    return { error: "Choose whether you are a shopper or a salon owner" };
  }
  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address" };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }
  if (accountType === "owner" && salonName.length < 2) {
    return { error: "Salon name must be at least 2 characters" };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY" };
  }

  const emailIntent: EmailIntent =
    accountType === "customer" ? "customer_signup" : "salon_signup";

  let partnerReferral: string | null = null;
  try {
    const blocked = await getEmailBlockReason(admin, email, emailIntent);
    if (blocked) return { error: blocked };

    if (accountType === "owner") {
      if (await salonNameTaken(admin, salonName)) {
        return {
          error: "This salon name is already taken. Choose a different name.",
        };
      }

      const rawRef =
        input.referralCode?.trim() ||
        (await import("@/lib/actions/partners").then((m) =>
          m.getRememberedPartnerReferral()
        )) ||
        null;
      if (rawRef) {
        const { resolveApprovedPartnerByUsername } = await import(
          "@/lib/actions/partners"
        );
        const partner = await resolveApprovedPartnerByUsername(rawRef);
        if (partner) {
          if (partner.email.toLowerCase() === email) {
            return {
              error:
                "You cannot open a salon with your own partner referral link. Use a different email, or sign up without your partner code.",
            };
          }
          partnerReferral = partner.username;
        }
      }
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Registration check failed" };
  }

  const userMetadata =
    accountType === "customer"
      ? {
          account_type: "customer" as const,
          full_name: fullName || null,
        }
      : {
          salon_name: salonName,
          account_type: "owner" as const,
          ...(partnerReferral ? { partner_referral: partnerReferral } : {}),
        };

  // Restart unverified signups instead of blocking "email already exists".
  const existing = await findAuthUserByEmail(admin, email);
  let userId: string;

  if (existing) {
    if (existing.email_confirmed_at) {
      return { error: "An account with this email already exists. Please sign in." };
    }
    const kind = classifyAuthMetadata(
      existing.user_metadata as Record<string, unknown>,
      existing.email
    );
    if (accountType === "owner" && kind === "customer") {
      return {
        error:
          "This email is already a Marketplace shopper account. Sign in to shop, or use a different email to open a salon.",
      };
    }
    if (accountType === "customer" && (kind === "owner" || kind === "staff")) {
      return {
        error:
          "This email already belongs to a salon account. Sign in to your salon, or use a different email to shop.",
      };
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(
      existing.id,
      {
        password,
        email_confirm: true,
        user_metadata: userMetadata,
      }
    );
    if (updateError) return { error: updateError.message };
    userId = existing.id;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        return { error: "An account with this email already exists. Please sign in." };
      }
      return { error: error.message };
    }

    if (!data.user) {
      return { error: "Could not create account" };
    }
    userId = data.user.id;
  }

  // Welcome email is best-effort — account is already verified and can sign in.
  const mailed =
    accountType === "customer"
      ? await sendCustomerWelcomeReadyEmail({
          email,
          fullName: fullName || null,
          userId,
        })
      : await sendSalonWelcomeReadyEmail({
          email,
          salonName,
          userId,
        });

  if (!mailed.ok) {
    console.error("[auth] welcome email failed", mailed.error);
  }

  return { success: true, needsEmailVerification: false };
}

/**
 * Resend signup verification for an unconfirmed account.
 * Password is required so we can mint a fresh signup link securely.
 */
export async function resendSignupVerificationEmail(input: {
  email: string;
  password: string;
}): Promise<ActionResult> {
  const email = normalizeEmail(input.email);
  const password = input.password;

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address" };
  }
  if (password.length < 8) {
    return { error: "Enter the password you used at sign up (min 8 characters)" };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY" };
  }

  try {
    const user = await findAuthUserByEmail(admin, email);
    if (!user) {
      return { error: "No signup found for this email. Please sign up first." };
    }
    if (user.email_confirmed_at) {
      return { error: "This email is already verified. Please sign in." };
    }

    const kind = classifyAuthMetadata(
      user.user_metadata as Record<string, unknown>,
      user.email
    );
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

    // Refresh password so generateLink(type=signup) matches what the user typed.
    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: false,
    });
    if (updateError) return { error: updateError.message };

    if (kind === "customer") {
      const mailed = await sendCustomerSignupVerificationEmail({
        email,
        fullName: typeof meta.full_name === "string" ? meta.full_name : null,
        password,
        userId: user.id,
      });
      if (!mailed.ok) {
        return {
          error: mailed.skipped
            ? "Email is not configured on the server."
            : mailed.error || "Could not resend verification email",
        };
      }
      return { success: true };
    }

    const salonName =
      typeof meta.salon_name === "string" && meta.salon_name.trim()
        ? meta.salon_name.trim()
        : "your salon";
    const mailed = await sendSalonSignupVerificationEmail({
      email,
      salonName,
      password,
      userId: user.id,
    });
    if (!mailed.ok) {
      return {
        error: mailed.skipped
          ? "Email is not configured on the server."
          : mailed.error || "Could not resend verification email",
      };
    }
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not resend verification email",
    };
  }
}

/**
 * Request password reset via Resend (does not use Supabase's built-in SMTP).
 * Always returns success to the client when the request is well-formed (anti-enumeration).
 */
export async function requestPasswordReset(
  emailInput: string
): Promise<ActionResult> {
  const email = normalizeEmail(emailInput);
  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address" };
  }

  try {
    const admin = createAdminClient();
    const user = await findAuthUserByEmail(admin, email);
    if (user?.email) {
      const meta = user.user_metadata ?? {};
      const name =
        (typeof meta.full_name === "string" && meta.full_name) ||
        (typeof meta.salon_name === "string" && meta.salon_name) ||
        null;
      await sendPasswordResetEmail({ email: user.email, name });
    }
  } catch (err) {
    console.error("[auth] password reset request failed", err);
  }

  return { success: true };
}

/** Force-confirm an email (platform admin bootstrap / legacy accounts only). */
export async function confirmUserEmail(emailInput: string): Promise<ActionResult> {
  const email = normalizeEmail(emailInput);
  if (!email) return { error: "Enter a valid email" };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY" };
  }

  try {
    const user = await findAuthUserByEmail(admin, email);
    if (!user) return { error: "No account found for this email" };

    if (user.email_confirmed_at) {
      return { success: true };
    }

    const { error } = await admin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });
    if (error) return { error: error.message };
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not confirm email" };
  }
}
