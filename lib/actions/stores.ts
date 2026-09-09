"use server";

import { resolveSubscription } from "@/lib/billing/subscription";
import { getStoreVisual, type StoreVisual } from "@/lib/marketing/store-visuals";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { getStoreAssetSignedUrl } from "@/lib/storage/store-assets";

export type PublicStore = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
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
  phone: string | null;
  email: string | null;
  services: {
    id: string;
    name: string;
    price: number;
    duration_minutes: number;
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

export async function listPublicStores(): Promise<PublicStore[]> {
  const admin = tryCreateAdminClient();
  if (!admin) return [];

  const { data: orgs, error } = await admin
    .from("organizations")
    .select(
      "id, name, slug, city, address, tagline, whatsapp_phone, logo_path, cover_path, trial_ends_at, subscription_ends_at, subscription_locked_at, subscription_status, admin_disabled_at, created_at"
    )
    .is("admin_disabled_at", null)
    .eq("public_listing_enabled", true)
    .order("name");

  if (error || !orgs?.length) return [];

  const operationalOrgs = orgs.filter((org) => resolveSubscription(org).isOperational);
  if (!operationalOrgs.length) return [];

  const stores = await Promise.all(
    operationalOrgs.map(async (org) => {
      const [
        { count: serviceCount },
        { count: staffCount },
        { data: serviceRows },
        logoUrl,
        coverUrl,
      ] = await Promise.all([
        admin
          .from("services")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id)
          .eq("is_active", true),
        admin
          .from("staff")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id)
          .eq("is_active", true)
          .eq("online_booking_enabled", true),
        admin
          .from("services")
          .select("name")
          .eq("organization_id", org.id)
          .eq("is_active", true)
          .order("name")
          .limit(3),
        resolveAssetUrl(org.logo_path),
        resolveAssetUrl(org.cover_path),
      ]);

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        city: org.city,
        address: org.address,
        tagline: org.tagline,
        whatsappPhone: org.whatsapp_phone,
        serviceCount: serviceCount ?? 0,
        staffCount: staffCount ?? 0,
        highlightServices: (serviceRows ?? []).map((s) => s.name),
        logoUrl,
        coverUrl,
        visual: getStoreVisual(org.slug, org.name),
      };
    })
  );

  return stores;
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

export async function getPublicStoreBySlug(slug: string): Promise<PublicStoreDetail | null> {
  const admin = tryCreateAdminClient();
  if (!admin) return null;

  const { data: org } = await admin
    .from("organizations")
    .select(
      "id, name, slug, city, address, tagline, phone, email, whatsapp_phone, logo_path, cover_path, booking_slot_minutes, booking_days_ahead, admin_disabled_at, public_listing_enabled, trial_ends_at, subscription_ends_at, subscription_locked_at, subscription_status, created_at"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!org || org.admin_disabled_at || !org.public_listing_enabled) return null;
  if (!resolveSubscription(org).isOperational) return null;

  const [{ data: services }, { data: staff }, logoUrl, coverUrl] = await Promise.all([
    admin
      .from("services")
      .select("id, name, price, duration_minutes")
      .eq("organization_id", org.id)
      .eq("is_active", true)
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

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    city: org.city,
    address: org.address,
    tagline: org.tagline,
    phone: org.phone,
    email: org.email,
    whatsappPhone: org.whatsapp_phone,
    bookingSlotMinutes: org.booking_slot_minutes,
    bookingDaysAhead: org.booking_days_ahead,
    serviceCount: serviceList.length,
    staffCount: staff?.length ?? 0,
    highlightServices: serviceList.slice(0, 3).map((s) => s.name),
    services: serviceList,
    staff: staff ?? [],
    logoUrl,
    coverUrl,
    visual: getStoreVisual(org.slug, org.name),
  };
}
