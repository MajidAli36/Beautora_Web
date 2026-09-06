import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPlatformAdminEmail } from "@/lib/billing/subscription";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import type { Database } from "@/types/database.types";

async function userHasOrganization(
  supabase: ReturnType<typeof createServerClient<Database>>,
  userId: string
) {
  const { count } = await supabase
    .from("organization_members")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  return (count ?? 0) > 0;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isServerAction = request.headers.has("next-action");
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isOnboardingRoute = pathname.startsWith("/onboarding");
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/customers") ||
    pathname.startsWith("/services") ||
    pathname.startsWith("/products") ||
    pathname.startsWith("/chairs") ||
    pathname.startsWith("/pos") ||
    pathname.startsWith("/sales") ||
    pathname.startsWith("/appointments") ||
    pathname.startsWith("/online-booking") ||
    pathname.startsWith("/queue") ||
    pathname.startsWith("/devices") ||
    pathname.startsWith("/staff") ||
    pathname.startsWith("/attendance") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/finances") ||
    pathname.startsWith("/whatsapp") ||
    pathname.startsWith("/feedback") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/platform");

  supabaseResponse.headers.set("x-pathname", pathname);

  // Never redirect Server Actions — middleware HTML redirects break the action
  // protocol ("An unexpected response was received from the server").
  if (isServerAction) {
    return supabaseResponse;
  }

  if (!user && (isProtectedRoute || isOnboardingRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user) {
    const hasOrg = await userHasOrganization(supabase, user.id);
    const isPlatformAdmin = isPlatformAdminEmail(user.email);
    const isPlatformRoute = pathname.startsWith("/platform");

    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = isPlatformAdmin
        ? "/platform"
        : hasOrg
          ? "/dashboard"
          : "/onboarding";
      return NextResponse.redirect(url);
    }

    if (isOnboardingRoute && hasOrg) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // Platform admins can use /platform without a salon org
    if (isProtectedRoute && !hasOrg) {
      if (isPlatformRoute && isPlatformAdmin) {
        return supabaseResponse;
      }
      const url = request.nextUrl.clone();
      url.pathname = isPlatformAdmin ? "/platform" : "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
