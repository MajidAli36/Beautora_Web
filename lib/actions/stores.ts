"use server";

import { unstable_cache } from "next/cache";
import { resolveSubscription } from "@/lib/billing/subscription";
import { getStoreVisual, type StoreVisual } from "@/lib/marketing/store-visuals";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { getStoreAssetSignedUrl } from "@/lib/storage/store-assets";

export type PublicStore = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  country: string | null;
  address: string | null;
  tagline: string | null;
  whatsappPhone: string | null;
  serviceCount: number;
  staffCount: number;
  /** Real service names from the catalog (for listing blurbs) */
  highlightServices: string[];
  logoUrl: string | null;
  /** Uploaded store cover when set; otherwise UI falls back to visual.coverImage */
  coverUrl: string | null;
  visual: StoreVisual;
};

export type PublicStoreDetail = PublicStore & {
  bookingSlotMinutes: number;
  bookingDaysAhead: number;
  /** When false, hide Book CTAs (store page can still be public). */
  publicBookingEnabled: boolean;
  phone: string | null;
  email: string | null;
  services: {
    id: string;
    name: string;
    price: number;
    duration_minutes: number;
  }[];
  /** Customer-facing retail products (RETAIL / BOTH — not in-house only). */
  products: {
    id: string;
    name: string;
    price: number;
    description: string | null;
  }[];
  staff: {
    id: string;
    full_name: string;
    job_title: string | null;
  }[];
};

async function resolveAssetUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const signed = await getStoreAssetSignedUrl(path);
  return signed.url ?? null;
}

async function listPublicStoresUncached(): Promise<PublicStore[]> {
  const admin = tryCreateAdminClient();
  if (!admin) return [];

  const { data: orgs, error } = await admin
    .from("organizations")
    .select(
      "id, name, slug, city, country, address, tagline, whatsapp_phone, logo_path, cover_path, trial_ends_at, subscription_ends_at, subscription_locked_at, subscription_status, admin_disabled_at, lifetime_access, created_at"
    )
    .is("admin_disabled_at", null)
    .eq("public_listing_enabled", true)
    .order("name");

  if (error || !orgs?.length) return [];

  const operationalOrgs = orgs.filter((org) => resolveSubscription(org).isOperational);
  if (!operationalOrgs.length) return [];

  const orgIds = operationalOrgs.map((o) => o.id);

  // Batch catalog counts instead of 3 queries × N stores.
  const [{ data: serviceRows }, { data: staffRows }] = await Promise.all([
    admin
      .from("services")
      .select("organization_id, name")
      .in("organization_id", orgIds)
      .eq("is_active", true)
      .order("name"),
    admin
      .from("staff")
      .select("organization_id")
      .in("organization_id", orgIds)
      .eq("is_active", true)
      .eq("online_booking_enabled", true)
      .is("deleted_at", null),
  ]);

  const serviceCountByOrg = new Map<string, number>();
  const highlightByOrg = new Map<string, string[]>();
  for (const row of serviceRows ?? []) {
    const id = row.organization_id as string;
    serviceCountByOrg.set(id, (serviceCountByOrg.get(id) ?? 0) + 1);
    const highlights = highlightByOrg.get(id) ?? [];
    if (highlights.length < 3) {
      highlights.push(row.name);
      highlightByOrg.set(id, highlights);
    }
  }

  const staffCountByOrg = new Map<string, number>();
  for (const row of staffRows ?? []) {
    const id = row.organization_id as string;
    staffCountByOrg.set(id, (staffCountByOrg.get(id) ?? 0) + 1);
  }

  // Sign only logos for the listing strip (covers use visual fallback) — half the R2 work.
  const logoUrls = await Promise.all(
    operationalOrgs.map((org) => resolveAssetUrl(org.logo_path))
  );

  return operationalOrgs.map((org, i) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    city: org.city,
    country: org.country ?? null,
    address: org.address,
    tagline: org.tagline,
    whatsappPhone: org.whatsapp_phone,
    serviceCount: serviceCountByOrg.get(org.id) ?? 0,
    staffCount: staffCountByOrg.get(org.id) ?? 0,
    highlightServices: highlightByOrg.get(org.id) ?? [],
    logoUrl: logoUrls[i] ?? null,
    coverUrl: null,
    visual: getStoreVisual(org.slug, org.name),
  }));
}

export async function listPublicStores(): Promise<PublicStore[]> {
  return unstable_cache(listPublicStoresUncached, ["public-stores-list"], {
    revalidate: 300,
    tags: ["public-stores"],
  })();
}

/** Unique cities that have at least one store (for filters). */
export async function listPublicStoreCities(): Promise<string[]> {
  const stores = await listPublicStores();
  const set = new Set<string>();
  for (const s of stores) {
    const city = s.city?.trim();
    if (city) set.add(city);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
}

/** Stores in a city, matching either display name or URL slug. */
export async function listPublicStoresByCitySlug(citySlug: string): Promise<{
  cityLabel: string;
  stores: PublicStore[];
} | null> {
  const { cityToSlug } = await import("@/lib/seo/site");
  const stores = await listPublicStores();
  const matched = stores.filter((s) => {
    const city = s.city?.trim();
    if (!city) return false;
    return cityToSlug(city) === citySlug;
  });
  if (!matched.length) return null;
  const cityLabel = matched[0].city!.trim();
  return { cityLabel, stores: matched };
}

export async function getPublicStoreBySlug(slug: string): Promise<PublicStoreDetail | null> {
  const admin = tryCreateAdminClient();
  if (!admin) return null;

  const { data: org } = await admin
    .from("organizations")
    .select(
      "id, name, slug, city, country, address, tagline, phone, email, whatsapp_phone, logo_path, cover_path, booking_slot_minutes, booking_days_ahead, admin_disabled_at, public_listing_enabled, public_booking_enabled, trial_ends_at, subscription_ends_at, subscription_locked_at, subscription_status, lifetime_access, created_at"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!org || org.admin_disabled_at || !org.public_listing_enabled) return null;
  if (!resolveSubscription(org).isOperational) return null;

  const [{ data: services }, { data: products }, { data: staff }, logoUrl, coverUrl] =
    await Promise.all([
      admin
        .from("services")
        .select("id, name, price, duration_minutes")
        .eq("organization_id", org.id)
        .eq("is_active", true)
        .order("name"),
      admin
        .from("products")
        .select("id, name, retail_price, description")
        .eq("organization_id", org.id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .in("product_kind", ["RETAIL", "BOTH"])
        .order("name"),
      admin
        .from("staff")
        .select("id, full_name, job_title")
        .eq("organization_id", org.id)
        .eq("is_active", true)
        .eq("online_booking_enabled", true)
        .order("full_name"),
      resolveAssetUrl(org.logo_path),
      resolveAssetUrl(org.cover_path),
    ]);

  const serviceList = services ?? [];
  const productList = (products ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    price: Number(p.retail_price),
    description: p.description,
  }));

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    city: org.city,
    country: org.country ?? null,
    address: org.address,
    tagline: org.tagline,
    phone: org.phone,
    email: org.email,
    whatsappPhone: org.whatsapp_phone,
    bookingSlotMinutes: org.booking_slot_minutes,
    bookingDaysAhead: org.booking_days_ahead,
    publicBookingEnabled: org.public_booking_enabled ?? true,
    serviceCount: serviceList.length,
    staffCount: staff?.length ?? 0,
    highlightServices: serviceList.slice(0, 3).map((s) => s.name),
    services: serviceList,
    products: productList,
    staff: staff ?? [],
    logoUrl,
    coverUrl,
    visual: getStoreVisual(org.slug, org.name),
  };
}
