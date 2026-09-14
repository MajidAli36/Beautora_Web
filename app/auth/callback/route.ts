import { NextResponse } from "next/server";
import { getActiveOrganization } from "@/lib/auth/organization";
import {
  isCustomerAccount,
  landingPathForProductIntent,
  parseProductIntent,
  safeAuthRedirect,
} from "@/lib/auth/account-types";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

function safeNextPath(raw: string | null) {
  return safeAuthRedirect(raw, "/dashboard");
}

/**
 * Handles:
 * - PKCE `?code=` (OAuth / some flows)
 * - Custom Resend links `?token_hash=&type=magiclink|recovery` (verifyOtp)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type");
  const requested = safeNextPath(
    searchParams.get("next") ?? searchParams.get("redirect")
  );

  const supabase = await createClient();
  let sessionOk = false;

  if (tokenHash && typeParam) {
    const type = typeParam as EmailOtpType;
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (error) {
      console.error("[auth/callback] verifyOtp failed", {
        type: typeParam,
        message: error.message,
      });
      return NextResponse.redirect(
        `${origin}/login?error=auth_callback_failed`
      );
    }
    sessionOk = true;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback] exchangeCode failed", {
        message: error.message,
      });
      return NextResponse.redirect(
        `${origin}/login?error=auth_callback_failed`
      );
    }
    sessionOk = true;
  }

  if (!sessionOk) {
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_failed`
    );
  }

  if (requested.startsWith("/reset-password")) {
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const meta = user?.user_metadata as Record<string, unknown> | undefined;

  if (isCustomerAccount(meta)) {
    return NextResponse.redirect(`${origin}/shop`);
  }

  const isPartner =
    meta?.account_type === "partner" || requested.startsWith("/partner");

  if (isPartner) {
    return NextResponse.redirect(`${origin}/partner/dashboard`);
  }

  const org = await getActiveOrganization();
  if (!org) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  const intentLanding = landingPathForProductIntent(
    parseProductIntent(meta?.product_intent)
  );
  const destination =
    requested === "/onboarding" || requested === "/dashboard"
      ? intentLanding
      : requested;

  return NextResponse.redirect(`${origin}${destination}`);
}
