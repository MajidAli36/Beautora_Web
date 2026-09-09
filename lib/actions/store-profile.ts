"use server";

import { revalidatePath } from "next/cache";
import { requireAction } from "@/lib/auth/permissions";
import { requireOrganization } from "@/lib/auth/organization";
import { createClient } from "@/lib/supabase/server";
import {
  getStoreAssetSignedUrl,
  uploadStoreAsset,
} from "@/lib/storage/store-assets";
import {
  DEFAULT_BUSINESS_HOURS,
  parseBusinessHours,
  type BusinessHoursDay,
  type PaymentAccount,
  type PaymentAccountType,
} from "@/lib/store/profile";
import {
  isSlugUniqueViolation,
  slugTakenMessage,
  slugUniqueViolationMessage,
  validateStoreSlug,
} from "@/lib/onboarding/slug";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types/commerce";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ACCOUNT_TYPES = new Set<PaymentAccountType>([
  "JAZZCASH",
  "EASYPAISA",
  "BANK",
  "OTHER",
]);

export type StoreProfile = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  whatsapp_phone: string | null;
  logo_path: string | null;
  cover_path: string | null;
  arrival_notes: string | null;
  business_hours: BusinessHoursDay[];
  /** When true, salon appears on public site + /book/[slug]. */
  public_listing_enabled: boolean;
  logoUrl: string | null;
  coverUrl: string | null;
  paymentAccounts: PaymentAccount[];
};

function imageExtension(mime: string): string | null {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/jpeg") return "jpg";
  return null;
}

async function resolveAssetUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const signed = await getStoreAssetSignedUrl(path);
  return signed.url ?? null;
}

function revalidateStoreSurfaces(slug?: string) {
  revalidatePath("/settings");
  revalidatePath("/online-booking");
  revalidatePath("/book");
  revalidatePath("/stores");
  revalidatePath("/");
  if (slug) {
    revalidatePath(`/book/${slug}`);
    revalidatePath(`/stores/${slug}`);
  }
}

export async function getStoreProfile(): Promise<StoreProfile | null> {
  const org = await requireOrganization();
  const supabase = await createClient();

  const [{ data }, { data: accounts }] = await Promise.all([
    supabase
      .from("organizations")
      .select(
        "id, name, slug, tagline, address, city, phone, email, whatsapp_phone, logo_path, cover_path, arrival_notes, business_hours, public_listing_enabled"
      )
      .eq("id", org.organizationId)
      .single(),
    supabase
      .from("organization_payment_accounts")
      .select(
        "id, account_type, label, account_title, account_number, bank_name, extra_note, is_active, sort_order"
      )
      .eq("organization_id", org.organizationId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (!data) return null;

  const [logoUrl, coverUrl] = await Promise.all([
    resolveAssetUrl(data.logo_path),
    resolveAssetUrl(data.cover_path),
  ]);

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    tagline: data.tagline,
    address: data.address,
    city: data.city,
    phone: data.phone,
    email: data.email,
    whatsapp_phone: data.whatsapp_phone,
    logo_path: data.logo_path,
    cover_path: data.cover_path,
    arrival_notes: data.arrival_notes,
    business_hours: parseBusinessHours(data.business_hours),
    public_listing_enabled: data.public_listing_enabled ?? true,
    logoUrl,
    coverUrl,
    paymentAccounts: (accounts ?? []) as PaymentAccount[],
  };
}

/** Toggle whether this salon is listed on the public site and /book/[slug]. */
export async function setStorePublicListing(
  enabled: boolean
): Promise<ActionResult> {
  const org = await requireAction("settings.manage");
  const supabase = await createClient();

  const { data: updated, error } = await supabase
    .from("organizations")
    .update({ public_listing_enabled: enabled })
    .eq("id", org.organizationId)
    .select("slug")
    .single();

  if (error) return { error: error.message };

  revalidateStoreSurfaces(updated?.slug);
  return { success: true };
}

export async function updateStoreProfile(input: {
  name: string;
  slug?: string;
  tagline?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  whatsappPhone?: string;
  arrivalNotes?: string;
}): Promise<ActionResult> {
  const org = await requireAction("settings.manage");
  const name = input.name.trim();
  if (name.length < 2) return { error: "Salon name is required" };

  const supabase = await createClient();

  const { data: current } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", org.organizationId)
    .single();

  const currentSlug = current?.slug ?? "";
  const wantsSlugChange = input.slug !== undefined;
  let nextSlug = currentSlug;

  if (wantsSlugChange) {
    const validated = validateStoreSlug(input.slug ?? "", {
      allowCurrent: currentSlug,
    });
    if (!validated.ok) return { error: validated.error };
    nextSlug = validated.slug;

    if (nextSlug !== currentSlug) {
      let admin;
      try {
        admin = createAdminClient();
      } catch {
        return { error: "Server misconfigured — cannot verify booking URL" };
      }
      const { data: slugClash } = await admin
        .from("organizations")
        .select("id")
        .eq("slug", nextSlug)
        .neq("id", org.organizationId)
        .maybeSingle();
      if (slugClash) {
        return { error: slugTakenMessage(nextSlug) };
      }
    }
  }

  const { data: clash } = await supabase
    .from("organizations")
    .select("id")
    .ilike("name", name)
    .neq("id", org.organizationId)
    .limit(1)
    .maybeSingle();
  if (clash) return { error: "Another salon already uses this name" };

  const city = input.city?.trim() || null;

  const { data: updated, error } = await supabase
    .from("organizations")
    .update(
      wantsSlugChange
        ? {
            name,
            slug: nextSlug,
            tagline: input.tagline?.trim() || null,
            address: input.address?.trim() || null,
            city,
            phone: input.phone?.trim() || null,
            email: input.email?.trim() || null,
            whatsapp_phone: input.whatsappPhone?.trim() || null,
            arrival_notes: input.arrivalNotes?.trim() || null,
          }
        : {
            name,
            tagline: input.tagline?.trim() || null,
            address: input.address?.trim() || null,
            city,
            phone: input.phone?.trim() || null,
            email: input.email?.trim() || null,
            whatsapp_phone: input.whatsappPhone?.trim() || null,
            arrival_notes: input.arrivalNotes?.trim() || null,
          }
    )
    .eq("id", org.organizationId)
    .select("slug")
    .single();

  if (error) {
    if (isSlugUniqueViolation(error.message)) {
      return { error: slugUniqueViolationMessage(nextSlug) };
    }
    return { error: error.message };
  }

  revalidateStoreSurfaces(currentSlug);
  if (updated?.slug && updated.slug !== currentSlug) {
    revalidateStoreSurfaces(updated.slug);
  }
  return { success: true };
}

export async function updateStoreHours(
  hours: BusinessHoursDay[]
): Promise<ActionResult> {
  const org = await requireAction("settings.manage");
  const normalized = parseBusinessHours(hours.length ? hours : DEFAULT_BUSINESS_HOURS);
  const supabase = await createClient();

  const { data: updated, error } = await supabase
    .from("organizations")
    .update({ business_hours: normalized })
    .eq("id", org.organizationId)
    .select("slug")
    .single();

  if (error) return { error: error.message };
  revalidateStoreSurfaces(updated?.slug);
  return { success: true };
}

export async function uploadStoreProfileImage(input: {
  kind: "logo" | "cover";
  file: File;
}): Promise<ActionResult> {
  const org = await requireAction("settings.manage");
  const file = input.file;
  if (!file || !(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload" };
  }
  if (file.size > MAX_IMAGE_BYTES) return { error: "Image must be 5 MB or smaller" };
  const mime = file.type || "";
  if (!ALLOWED_IMAGE_TYPES.has(mime)) {
    return { error: "Use JPG, PNG, or WebP" };
  }
  const extension = imageExtension(mime);
  if (!extension) return { error: "Unsupported image type" };

  const bytes = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadStoreAsset({
    organizationId: org.organizationId,
    kind: input.kind,
    bytes,
    contentType: mime,
    extension,
  });
  if (!uploaded.ok) return { error: uploaded.error };

  const patch =
    input.kind === "logo"
      ? { logo_path: uploaded.result.path }
      : { cover_path: uploaded.result.path };
  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("organizations")
    .update(patch)
    .eq("id", org.organizationId)
    .select("slug")
    .single();

  if (error) return { error: error.message };
  revalidateStoreSurfaces(updated?.slug);
  return { success: true };
}

export async function removeStoreProfileImage(
  kind: "logo" | "cover"
): Promise<ActionResult> {
  const org = await requireAction("settings.manage");
  const patch =
    kind === "logo" ? { logo_path: null } : { cover_path: null };
  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("organizations")
    .update(patch)
    .eq("id", org.organizationId)
    .select("slug")
    .single();
  if (error) return { error: error.message };
  revalidateStoreSurfaces(updated?.slug);
  return { success: true };
}

export async function createPaymentAccount(input: {
  accountType: PaymentAccountType;
  label: string;
  accountTitle?: string;
  accountNumber: string;
  bankName?: string;
  extraNote?: string;
}): Promise<ActionResult> {
  const org = await requireAction("settings.manage");
  if (!ACCOUNT_TYPES.has(input.accountType)) {
    return { error: "Invalid account type" };
  }
  const label = input.label.trim();
  const accountNumber = input.accountNumber.trim();
  if (!label) return { error: "Label is required (e.g. Main JazzCash)" };
  if (accountNumber.length < 5) return { error: "Enter a valid account / wallet number" };

  const supabase = await createClient();
  const { count } = await supabase
    .from("organization_payment_accounts")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", org.organizationId);

  const { error } = await supabase.from("organization_payment_accounts").insert({
    organization_id: org.organizationId,
    account_type: input.accountType,
    label,
    account_title: input.accountTitle?.trim() || null,
    account_number: accountNumber,
    bank_name: input.bankName?.trim() || null,
    extra_note: input.extraNote?.trim() || null,
    is_active: true,
    sort_order: count ?? 0,
  });

  if (error) return { error: error.message };

  const { data: orgRow } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", org.organizationId)
    .single();
  revalidateStoreSurfaces(orgRow?.slug);
  return { success: true };
}

export async function updatePaymentAccount(input: {
  id: string;
  accountType: PaymentAccountType;
  label: string;
  accountTitle?: string;
  accountNumber: string;
  bankName?: string;
  extraNote?: string;
  isActive: boolean;
}): Promise<ActionResult> {
  const org = await requireAction("settings.manage");
  if (!ACCOUNT_TYPES.has(input.accountType)) {
    return { error: "Invalid account type" };
  }
  const label = input.label.trim();
  const accountNumber = input.accountNumber.trim();
  if (!label) return { error: "Label is required" };
  if (accountNumber.length < 5) return { error: "Enter a valid account / wallet number" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_payment_accounts")
    .update({
      account_type: input.accountType,
      label,
      account_title: input.accountTitle?.trim() || null,
      account_number: accountNumber,
      bank_name: input.bankName?.trim() || null,
      extra_note: input.extraNote?.trim() || null,
      is_active: input.isActive,
    })
    .eq("id", input.id)
    .eq("organization_id", org.organizationId);

  if (error) return { error: error.message };

  const { data: orgRow } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", org.organizationId)
    .single();
  revalidateStoreSurfaces(orgRow?.slug);
  return { success: true };
}

export async function deletePaymentAccount(id: string): Promise<ActionResult> {
  const org = await requireAction("settings.manage");
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_payment_accounts")
    .delete()
    .eq("id", id)
    .eq("organization_id", org.organizationId);
  if (error) return { error: error.message };

  const { data: orgRow } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", org.organizationId)
    .single();
  revalidateStoreSurfaces(orgRow?.slug);
  return { success: true };
}

/** Public booking identity for a store slug (no auth). */
export async function getPublicStoreBookingProfile(slug: string) {
  const { tryCreateAdminClient } = await import("@/lib/supabase/admin");
  const {
    ensureOnlineAdvanceDefaults,
    ensureOnlineBookableStaff,
  } = await import("@/lib/booking/public-booking");
  const admin = tryCreateAdminClient();
  if (!admin) return null;

  const { data: org } = await admin
    .from("organizations")
    .select(
      "id, name, slug, tagline, address, city, phone, email, whatsapp_phone, logo_path, cover_path, arrival_notes, business_hours, booking_slot_minutes, booking_days_ahead, booking_advance_amount, booking_advance_percent, booking_payment_instructions, admin_disabled_at, public_listing_enabled"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!org || org.admin_disabled_at || !org.public_listing_enabled) return null;

  const [staff, advance, { data: services }, { data: accounts }, logoUrl, coverUrl] =
    await Promise.all([
      ensureOnlineBookableStaff(admin, org.id),
      ensureOnlineAdvanceDefaults(admin, org),
      admin
        .from("services")
        .select("id, name, price, duration_minutes")
        .eq("organization_id", org.id)
        .eq("is_active", true)
        .order("name"),
      admin
        .from("organization_payment_accounts")
        .select(
          "id, account_type, label, account_title, account_number, bank_name, extra_note, is_active, sort_order"
        )
        .eq("organization_id", org.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      resolveAssetUrl(org.logo_path),
      resolveAssetUrl(org.cover_path),
    ]);

  return {
    ...org,
    booking_advance_amount: advance.booking_advance_amount,
    booking_advance_percent: advance.booking_advance_percent,
    booking_payment_instructions: advance.booking_payment_instructions,
    business_hours: parseBusinessHours(org.business_hours),
    logoUrl,
    coverUrl,
    paymentAccounts: (accounts ?? []) as PaymentAccount[],
    services: services ?? [],
    staff,
  };
}
