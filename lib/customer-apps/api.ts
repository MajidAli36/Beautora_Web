import { NextResponse } from "next/server";
import { resolvePublishedAppContext } from "@/lib/customer-apps/service";
import { createAdminClient } from "@/lib/supabase/admin";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Short-lived edge/CDN cache for published catalog endpoints. */
export function jsonCached(data: unknown, maxAgeSeconds = 60) {
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": `public, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 2}`,
    },
  });
}

/** Normalize phone for exact lookup — rejects short/partial probes. */
export function requireLookupPhone(raw: string | null | undefined): {
  phone: string;
} | { error: string; status: number } {
  const digits = (raw ?? "").replace(/[^\d+]/g, "").trim();
  const digitCount = digits.replace(/\D/g, "").length;
  if (digitCount < 10) {
    return { error: "phone must include at least 10 digits", status: 400 };
  }
  return { phone: digits };
}

/** Resolve client app from `x-beautora-app-slug` or `?app=` — never trust client-supplied org IDs. */
export async function resolveCustomerAppRequest(request: Request) {
  const url = new URL(request.url);
  const slug =
    request.headers.get("x-beautora-app-slug")?.trim() ||
    url.searchParams.get("app")?.trim() ||
    "";
  if (!slug) return { error: "Missing app slug (x-beautora-app-slug or ?app=)", status: 400 as const };
  const ctx = await resolvePublishedAppContext(slug);
  if ("error" in ctx) return ctx;
  return ctx;
}

export async function listScopedSalons(organizationIds: string[]) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select(
      "id, name, slug, city, address, phone, tagline, public_booking_enabled, logo_path"
    )
    .in("id", organizationIds)
    .eq("public_booking_enabled", true);
  return data ?? [];
}

export async function listScopedServices(organizationIds: string[]) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("services")
    .select("id, organization_id, name, description, duration_minutes, price, category_id")
    .in("organization_id", organizationIds)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("name")
    .limit(500);
  return data ?? [];
}

export async function listScopedProducts(organizationIds: string[]) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("products")
    .select(
      "id, organization_id, name, description, retail_price, stock_quantity, product_kind, sku"
    )
    .in("organization_id", organizationIds)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("name")
    .limit(500);
  return data ?? [];
}

/** Online-bookable stylists for orgs assigned to the customer app. */
export async function listScopedStaff(organizationIds: string[]) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("staff")
    .select("id, organization_id, full_name, job_title, online_booking_enabled")
    .in("organization_id", organizationIds)
    .eq("is_active", true)
    .eq("online_booking_enabled", true)
    .is("deleted_at", null)
    .order("full_name")
    .limit(500);
  return data ?? [];
}
