import { NextResponse } from "next/server";
import { getActiveOrganization } from "@/lib/auth/organization";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedRaw =
    searchParams.get("next") ?? searchParams.get("redirect") ?? "/dashboard";
  const requested = requestedRaw.startsWith("/") ? requestedRaw : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Password recovery / explicit next paths take priority
      if (requested.startsWith("/reset-password")) {
        return NextResponse.redirect(`${origin}/reset-password`);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const isPartner =
        user?.user_metadata?.account_type === "partner" ||
        requested.startsWith("/partner");

      if (isPartner) {
        return NextResponse.redirect(`${origin}/partner/dashboard`);
      }

      const org = await getActiveOrganization();
      const destination = org
        ? requested === "/onboarding"
          ? "/dashboard"
          : requested
        : "/onboarding";
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
