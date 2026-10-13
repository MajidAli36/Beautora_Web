import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPlatformAdminEmail } from "@/lib/billing/subscription";
import {
  isCustomerAccount,
  landingPathForProductIntent,
  parseProductIntent,
} from "@/lib/auth/account-types";
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

async function userIsPartner(
  supabase: ReturnType<typeof createServerClient<Database>>,
  user: { id: string; user_metadata?: Record<string, unknown> }
) {
  if (user.user_metadata?.account_type === "partner") return true;
  const { data } = await supabase
    .from("partners")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  return Boolean(data);
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  const edgeCountry =
    request.headers.get("x-vercel-ip-country")?.trim() ||
    request.headers.get("cf-ipcountry")?.trim() ||
    null;
  if (edgeCountry) {
    requestHeaders.set("x-country-code", edgeCountry);
  }

  const next = () =>
    NextResponse.next({
      request: { headers: requestHeaders },
    });

  let supabaseResponse = next();

  const isServerAction = request.headers.has("next-action");
  const isResetPasswordRoute = pathname.startsWith("/reset-password");
  const isInviteRoute = pathname.startsWith("/invite");
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    isResetPasswordRoute ||
    isInviteRoute;
  const isOnboardingRoute = pathname.startsWith("/onboarding");
  const isPartnerDashboard = pathname.startsWith("/partner/dashboard");
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/customers") ||
    pathname.startsWith("/services") ||
    pathname.startsWith("/products") ||
    pathname.startsWith("/in-house") ||
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
    pathname.startsWith("/platform") ||
    pathname.startsWith("/marketplace") ||
    isPartnerDashboard;

  // Skip Supabase getUser() on anonymous marketing traffic (no auth cookie).
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.includes("-auth-token") || c.name.startsWith("sb-"));

  if (!hasAuthCookie) {
    if (isServerAction) return supabaseResponse;
    if (isProtectedRoute || isOnboardingRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    // Public marketing / shop / book — no session work.
    return supabaseResponse;
  }

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
          supabaseResponse = next();
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

  // Refresh session cookies for server actions, then skip route redirects.
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
    const isPlatformAdmin = isPlatformAdminEmail(user.email);
    const isPartner = await userIsPartner(supabase, user);
    const isCustomer = isCustomerAccount(
      user.user_metadata as Record<string, unknown>
    );
    const isPlatformRoute = pathname.startsWith("/platform");

    // Marketplace shoppers never enter salon app / onboarding / partner portal
    if (isCustomer && !isPlatformAdmin) {
      if (
        (isAuthRoute && !isResetPasswordRoute) ||
        isOnboardingRoute ||
        isProtectedRoute
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/shop";
        url.search = "";
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    // Partners only ever use the partner dashboard (never salon app / onboarding)
    if (isPartner && !isPlatformAdmin) {
      if (
        (isAuthRoute && !isResetPasswordRoute) ||
        isOnboardingRoute ||
        (isProtectedRoute && !isPartnerDashboard)
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/partner/dashboard";
        return NextResponse.redirect(url);
      }
      if (isPartnerDashboard) {
        return supabaseResponse;
      }
    }

    const hasOrg = await userHasOrganization(supabase, user.id);
    const ownerLanding = landingPathForProductIntent(
      parseProductIntent(
        (user.user_metadata as Record<string, unknown> | undefined)?.product_intent
      )
    );

    // Allow recovery + invite accept pages while authenticated
    if (isAuthRoute && !isResetPasswordRoute && !isInviteRoute) {
      const url = request.nextUrl.clone();
      url.pathname = isPlatformAdmin
        ? "/platform"
        : hasOrg
          ? ownerLanding
          : "/onboarding";
      return NextResponse.redirect(url);
    }

    if (isOnboardingRoute && hasOrg) {
      const url = request.nextUrl.clone();
      url.pathname = ownerLanding;
      return NextResponse.redirect(url);
    }

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
