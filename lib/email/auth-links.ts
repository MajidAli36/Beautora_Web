import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailLinkBaseUrl } from "@/lib/email/config";

export type AuthLinkKind = "magiclink" | "recovery";

/**
 * Build a Beautora-hosted verify URL that uses hashed_token + verifyOtp.
 * Do NOT email Supabase's hosted /auth/v1/verify action_link — that breaks PKCE SSR.
 */
function buildAppAuthLink(input: {
  tokenHash: string;
  type: AuthLinkKind;
  nextPath: string;
}) {
  const base = getEmailLinkBaseUrl();
  const next = input.nextPath.startsWith("/") ? input.nextPath : `/${input.nextPath}`;
  const params = new URLSearchParams({
    token_hash: input.tokenHash,
    type: input.type,
    next,
  });
  return `${base}/auth/callback?${params.toString()}`;
}

/**
 * Generate a verify / reset link for Resend emails (hashed_token for SSR verifyOtp).
 */
export async function generateAuthActionLink(input: {
  email: string;
  type: AuthLinkKind;
  nextPath: string;
}): Promise<{ ok: true; actionLink: string } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  const next = input.nextPath.startsWith("/") ? input.nextPath : `/${input.nextPath}`;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: input.type,
      email,
      options: {
        redirectTo: `${getEmailLinkBaseUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    const tokenHash = data.properties?.hashed_token;
    if (!tokenHash) {
      return { ok: false, error: "Could not create secure email link" };
    }

    const actionLink = buildAppAuthLink({
      tokenHash,
      type: input.type,
      nextPath: next,
    });

    console.info("[email] auth link prepared", {
      type: input.type,
      redirectHost: new URL(actionLink).origin,
      via: "token_hash",
    });

    return { ok: true, actionLink };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not create email link",
    };
  }
}
