"use server";

import {
  findAuthUserByEmail,
  getEmailBlockReason,
  normalizeEmail,
} from "@/lib/auth/email-guards";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendPasswordResetEmail,
  sendSalonSignupVerificationEmail,
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

export async function checkEmailAvailable(emailInput: string): Promise<{
  available: boolean;
  error?: string;
}> {
  const email = normalizeEmail(emailInput);
  if (!email || !email.includes("@")) {
    return { available: false, error: "Enter a valid email" };
  }

  try {
    const admin = createAdminClient();
    const blocked = await getEmailBlockReason(admin, email, "salon_signup");
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
 * User completes signup by clicking the email link (session + confirmed).
 */
export async function registerAccount(input: {
  email: string;
  password: string;
  salonName: string;
}): Promise<ActionResult & { needsEmailVerification?: boolean }> {
  const email = normalizeEmail(input.email);
  const password = input.password;
  const salonName = normalizeSalonName(input.salonName);

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address" };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }
  if (salonName.length < 2) {
    return { error: "Salon name must be at least 2 characters" };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY" };
  }

  try {
    const blocked = await getEmailBlockReason(admin, email, "salon_signup");
    if (blocked) return { error: blocked };

    if (await salonNameTaken(admin, salonName)) {
      return {
        error: "This salon name is already taken. Choose a different name.",
      };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Registration check failed" };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: {
      salon_name: salonName,
      account_type: "owner",
    },
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

  const mailed = await sendSalonSignupVerificationEmail({
    email,
    salonName,
    userId: data.user.id,
  });

  if (!mailed.ok) {
    await admin.auth.admin.deleteUser(data.user.id);
    return {
      error: mailed.skipped
        ? "Email is not configured on the server. Please try again later."
        : `Could not send verification email: ${mailed.error}`,
    };
  }

  return { success: true, needsEmailVerification: true };
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
