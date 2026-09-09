import { createAdminClient } from "@/lib/supabase/admin";
import { getAppBaseUrl } from "@/lib/email/config";

export type AuthLinkKind = "magiclink" | "recovery";

/**
 * Generate a Supabase auth action link (verify / reset) for Resend emails.
 * Tokens stay inside the Supabase-hosted link — we never log them.
 */
export async function generateAuthActionLink(input: {
  email: string;
  type: AuthLinkKind;
  nextPath: string;
}): Promise<{ ok: true; actionLink: string } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  const next = input.nextPath.startsWith("/") ? input.nextPath : `/${input.nextPath}`;
  const redirectTo = `${getAppBaseUrl()}/auth/callback?next=${encodeURIComponent(next)}`;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: input.type,
      email,
      options: { redirectTo },
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    const actionLink =
      data.properties?.action_link ||
      (data as { action_link?: string }).action_link ||
      null;

    if (!actionLink) {
      return { ok: false, error: "Could not create secure email link" };
    }

    return { ok: true, actionLink };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not create email link",
    };
  }
}
