import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailLinkBaseUrl } from "@/lib/email/config";
import type { EmailOtpType } from "@supabase/supabase-js";

export type AuthLinkKind = "magiclink" | "recovery" | "signup";

/**
 * Build a Beautora-hosted verify URL that uses hashed_token + verifyOtp.
 * Do NOT email Supabase's hosted /auth/v1/verify action_link — that breaks PKCE SSR.
 *
 * Links go to /auth/confirm (button click) so email-scanner prefetch cannot burn the token.
 */
function buildAppAuthLink(input: {
  tokenHash: string;
  type: EmailOtpType | string;
  nextPath: string;
}) {
  const base = getEmailLinkBaseUrl();
  const next = input.nextPath.startsWith("/") ? input.nextPath : `/${input.nextPath}`;
  const params = new URLSearchParams({
    token_hash: input.tokenHash,
    type: String(input.type),
    next,
  });
  return `${base}/auth/confirm?${params.toString()}`;
}

/**
 * Generate a verify / reset link for Resend emails (hashed_token for SSR verifyOtp).
 *
 * For brand-new accounts created with email_confirm:false, prefer type "signup"
 * and pass the same password used in createUser.
 */
export async function generateAuthActionLink(input: {
  email: string;
  type: AuthLinkKind;
  nextPath: string;
  /** Required when type is "signup" (Supabase GenerateSignupLinkParams). */
  password?: string;
}): Promise<{ ok: true; actionLink: string } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  const next = input.nextPath.startsWith("/") ? input.nextPath : `/${input.nextPath}`;

  try {
    const admin = createAdminClient();
    const redirectTo = `${getEmailLinkBaseUrl()}/auth/callback?next=${encodeURIComponent(next)}`;

    if (input.type === "signup" && !input.password) {
      return {
        ok: false,
        error: "Signup verification link requires the account password",
      };
    }

    const { data, error } =
      input.type === "signup"
        ? await admin.auth.admin.generateLink({
            type: "signup",
            email,
            password: input.password!,
            options: { redirectTo },
          })
        : await admin.auth.admin.generateLink({
            type: input.type,
            email,
            options: { redirectTo },
          });

    if (error) {
      return { ok: false, error: error.message };
    }

    const tokenHash = data.properties?.hashed_token;
    if (!tokenHash) {
      return { ok: false, error: "Could not create secure email link" };
    }

    // Must match what GoTrue minted — hardcoding "magiclink" breaks new-account verify.
    const verificationType =
      data.properties?.verification_type ||
      (input.type === "signup" ? "signup" : input.type);

    const actionLink = buildAppAuthLink({
      tokenHash,
      type: verificationType,
      nextPath: next,
    });

    console.info("[email] auth link prepared", {
      requestedType: input.type,
      verificationType,
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
