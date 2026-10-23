"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/supabase/env";
import {
  PLATFORM_HARDCODED_ADMIN,
  isHardcodedPlatformAdminEmail,
} from "@/lib/platform/admin";

function emailMatchesUser(
  user: {
    email?: string | null;
    identities?: Array<{ email?: string | null; identity_data?: Record<string, unknown> }> | null;
  },
  target: string
): boolean {
  if (user.email?.toLowerCase() === target) return true;
  return (user.identities ?? []).some((identity) => {
    if (identity.email?.toLowerCase() === target) return true;
    const identityEmail = identity.identity_data?.email;
    return typeof identityEmail === "string" && identityEmail.toLowerCase() === target;
  });
}

/** Prefer Auth Admin email filter — listUsers pagination can miss existing users. */
async function findUserIdByEmailDirect(email: string): Promise<string | null> {
  const target = email.trim().toLowerCase();
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!key) return null;

  const endpoint = new URL(`${url}/auth/v1/admin/users`);
  endpoint.searchParams.set("email", target);

  const res = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
    },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const body = (await res.json()) as {
    users?: Array<{
      id: string;
      email?: string | null;
      identities?: Array<{ email?: string | null; identity_data?: Record<string, unknown> }> | null;
    }>;
  };

  const found = (body.users ?? []).find((u) => emailMatchesUser(u, target));
  return found?.id ?? null;
}

async function findUserIdByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string
): Promise<string | null> {
  const target = email.trim().toLowerCase();

  const directId = await findUserIdByEmailDirect(target);
  if (directId) return directId;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const found = data.users.find((u) => emailMatchesUser(u, target));
    if (found) return found.id;
    if (data.users.length < 200) break;
  }
  return null;
}

async function syncPlatformAdminUser(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  syncPassword: boolean
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ...(syncPassword ? { password: PLATFORM_HARDCODED_ADMIN.password } : {}),
    email_confirm: true,
    user_metadata: {
      account_type: "platform_admin",
      full_name: PLATFORM_HARDCODED_ADMIN.fullName,
    },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Ensure the hardcoded platform admin exists and can sign in.
 * - Creates the user if missing
 * - Confirms email + syncs password when syncPassword is true (login attempt)
 * - Does NOT reset password on every login-page view (avoids first-login races)
 */
export async function ensureHardcodedPlatformAdmin(options?: {
  syncPassword?: boolean;
}): Promise<{ ok: boolean; created?: boolean; error?: string }> {
  const syncPassword = options?.syncPassword ?? false;

  try {
    const admin = createAdminClient();
    const email = PLATFORM_HARDCODED_ADMIN.email;
    const existingId = await findUserIdByEmail(admin, email);

    if (existingId) {
      const synced = await syncPlatformAdminUser(admin, existingId, syncPassword);
      if (!synced.ok) return { ok: false, error: synced.error };
      return { ok: true, created: false };
    }

    const { error } = await admin.auth.admin.createUser({
      email,
      password: PLATFORM_HARDCODED_ADMIN.password,
      email_confirm: true,
      user_metadata: {
        account_type: "platform_admin",
        full_name: PLATFORM_HARDCODED_ADMIN.fullName,
      },
    });
    if (error) {
      // User already exists (lookup miss or race) — sync if we can find them, else let sign-in proceed
      if (/already|registered|exists/i.test(error.message)) {
        const id = await findUserIdByEmail(admin, email);
        if (id) {
          const synced = await syncPlatformAdminUser(admin, id, true);
          if (!synced.ok) return { ok: false, error: synced.error };
          return { ok: true, created: false };
        }
        // Auth says the email exists; do not surface createUser's signup error on Sign in
        return { ok: true, created: false };
      }
      return { ok: false, error: error.message };
    }

    // Brief pause so Auth can index the new user before sign-in
    await new Promise((r) => setTimeout(r, 400));
    return { ok: true, created: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not ensure platform admin",
    };
  }
}

export async function getLoginRedirectPath(): Promise<string> {
  const { createClient } = await import("@/lib/supabase/server");
  const { isPlatformAdminEmail } = await import("@/lib/billing/subscription");
  const { getActiveOrganization } = await import("@/lib/auth/organization");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "/login";

  if (isPlatformAdminEmail(user.email) || isHardcodedPlatformAdminEmail(user.email)) {
    return "/platform";
  }

  const org = await getActiveOrganization();
  return org ? "/dashboard" : "/onboarding";
}
