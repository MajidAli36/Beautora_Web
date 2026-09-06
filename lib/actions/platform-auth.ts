"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  PLATFORM_HARDCODED_ADMIN,
  isHardcodedPlatformAdminEmail,
} from "@/lib/platform/admin";

async function findUserIdByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string
): Promise<string | null> {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const found = data.users.find((u) => u.email?.toLowerCase() === target);
    if (found) return found.id;
    if (data.users.length < 200) break;
  }
  return null;
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
      if (syncPassword) {
        const { error } = await admin.auth.admin.updateUserById(existingId, {
          password: PLATFORM_HARDCODED_ADMIN.password,
          email_confirm: true,
          user_metadata: {
            account_type: "platform_admin",
            full_name: PLATFORM_HARDCODED_ADMIN.fullName,
          },
        });
        if (error) return { ok: false, error: error.message };
      } else {
        // Soft ensure: confirm email only (no password churn on page load)
        const { error } = await admin.auth.admin.updateUserById(existingId, {
          email_confirm: true,
          user_metadata: {
            account_type: "platform_admin",
            full_name: PLATFORM_HARDCODED_ADMIN.fullName,
          },
        });
        if (error) return { ok: false, error: error.message };
      }
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
      // Race: another request created the user — sync password and continue
      if (/already|registered|exists/i.test(error.message)) {
        const id = await findUserIdByEmail(admin, email);
        if (id) {
          await admin.auth.admin.updateUserById(id, {
            password: PLATFORM_HARDCODED_ADMIN.password,
            email_confirm: true,
          });
          return { ok: true, created: false };
        }
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
