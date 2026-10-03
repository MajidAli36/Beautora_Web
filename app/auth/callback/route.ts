import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  isCustomerAccount,
  landingPathForProductIntent,
  parseProductIntent,
  safeAuthRedirect,
} from "@/lib/auth/account-types";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import type { Database } from "@/types/database.types";
import type { EmailOtpType } from "@supabase/supabase-js";

function safeNextPath(raw: string | null) {
  return safeAuthRedirect(raw, "/dashboard");
}

function otpTypeCandidates(typeParam: string): EmailOtpType[] {
  const primary = typeParam as EmailOtpType;
  const extras: EmailOtpType[] = ["signup", "magiclink", "email", "invite"];
  return [primary, ...extras.filter((t) => t !== primary)];
}

/**
 * Handles:
 * - PKCE `?code=` (OAuth / some flows)
 * - Custom Resend links `?token_hash=&type=signup|magiclink|recovery` (verifyOtp)
 *
 * Cookies are written onto the redirect response (required for App Router Route Handlers).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type");
  const requested = safeNextPath(
    searchParams.get("next") ?? searchParams.get("redirect")
  );

  let redirectPath = `/login?error=auth_callback_failed`;
  const cookiesToApply: { name: string; value: string; options: Record<string, unknown> }[] =
    [];

  const supabase = createServerClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookiesToApply.push({ name, value, options: options ?? {} });
          });
        },
      },
    }
  );

  let sessionOk = false;

  if (tokenHash && typeParam) {
    let lastError: string | null = null;
    for (const type of otpTypeCandidates(typeParam)) {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash: tokenHash,
      });
      if (!error) {
        sessionOk = true;
        break;
      }
      lastError = error.message;
      // Token already consumed / invalid — do not keep trying forever with same hash.
      if (/expired|invalid|used/i.test(error.message) && type === typeParam) {
        // still try fallbacks once; some projects mint signup tokens labeled oddly
      }
    }
    if (!sessionOk) {
      console.error("[auth/callback] verifyOtp failed", {
        type: typeParam,
        message: lastError,
      });
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback] exchangeCode failed", {
        message: error.message,
      });
    } else {
      sessionOk = true;
    }
  }

  if (sessionOk) {
    if (requested.startsWith("/reset-password")) {
      redirectPath = "/reset-password";
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const meta = user?.user_metadata as Record<string, unknown> | undefined;

      if (isCustomerAccount(meta)) {
        redirectPath = "/shop";
      } else {
        const isPartner =
          meta?.account_type === "partner" || requested.startsWith("/partner");

        if (isPartner) {
          redirectPath = "/partner/dashboard";
        } else {
          // Use the same client that just received the session (cookies not flushed yet).
          const { data: membership } = user?.id
            ? await supabase
                .from("organization_members")
                .select("organization_id")
                .eq("user_id", user.id)
                .limit(1)
                .maybeSingle()
            : { data: null };

          if (!membership) {
            redirectPath = "/onboarding";
          } else {
            const intentLanding = landingPathForProductIntent(
              parseProductIntent(meta?.product_intent)
            );
            redirectPath =
              requested === "/onboarding" || requested === "/dashboard"
                ? intentLanding
                : requested;
          }
        }
      }
    }
  }

  const response = NextResponse.redirect(`${origin}${redirectPath}`);
  for (const { name, value, options } of cookiesToApply) {
    response.cookies.set(name, value, options);
  }
  return response;
}
