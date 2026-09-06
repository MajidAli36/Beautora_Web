"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types/commerce";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeSalonName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

async function findAuthUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string
) {
  const target = normalizeEmail(email);
  // Admin API has no get-by-email; page through users (fine for early-stage SaaS).
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const found = data.users.find((u) => u.email?.toLowerCase() === target);
    if (found) return found;
    if (data.users.length < 200) break;
  }
  return null;
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
    const existing = await findAuthUserByEmail(admin, email);
    if (!existing) return { available: true };

    const meta = existing.user_metadata ?? {};
    const isStaff =
      meta.account_type === "staff" ||
      meta.created_by_admin === true ||
      Boolean(meta.salon_role);

    if (isStaff) {
      return {
        available: false,
        error:
          "This email is already a staff login for a salon. Sign in with your credentials — you cannot open a new store with this email.",
      };
    }

    return {
      available: false,
      error: "An account with this email already exists. Please sign in.",
    };
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
 * Creates an auth user with email already confirmed (no confirmation email).
 * Client should then signInWithPassword with the same credentials.
 */
export async function registerAccount(input: {
  email: string;
  password: string;
  salonName: string;
}): Promise<ActionResult> {
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
    const existing = await findAuthUserByEmail(admin, email);
    if (existing) {
      const meta = existing.user_metadata ?? {};
      const isStaff =
        meta.account_type === "staff" ||
        meta.created_by_admin === true ||
        Boolean(meta.salon_role);

      if (isStaff) {
        return {
          error:
            "This email is already a staff login for a salon. Sign in instead — staff cannot create a new store with this email.",
        };
      }
      return { error: "An account with this email already exists. Please sign in." };
    }

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
    email_confirm: true,
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

  return { success: true };
}

/** Force-confirm an email so login works without confirmation emails. */
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
