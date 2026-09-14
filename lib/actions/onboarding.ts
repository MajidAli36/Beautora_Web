"use server";

import { revalidatePath } from "next/cache";
import {
  isSlugUniqueViolation,
  slugTakenMessage,
  slugUniqueViolationMessage,
  validateStoreSlug,
} from "@/lib/onboarding/slug";
import { SUBSCRIPTION } from "@/lib/billing/subscription";
import { requireStoreLocation } from "@/lib/location/store-location";
import {
  defaultAppModeForIntent,
  landingPathForProductIntent,
  parseProductIntent,
  type ProductIntent,
} from "@/lib/auth/account-types";
import { APP_MODE_COOKIE } from "@/lib/marketplace/constants";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import type { ActionResult } from "@/types/commerce";

export type CreateOrganizationInput = {
  salonName: string;
  /** Required — used for directory filters and future country/city grouping. */
  city: string;
  /** Required — used for directory filters and future country/city grouping. */
  country: string;
  slug?: string;
  whatsappPhone?: string;
  bookingSlotMinutes?: number;
  bookingDaysAhead?: number;
  /** Partner username / referral code from ?ref= or cookie */
  referralCode?: string | null;
  /** Marketplace | Salon POS | Both */
  productIntent: ProductIntent;
};

export async function createSalonOrganization(
  input: CreateOrganizationInput
): Promise<
  ActionResult & { slug?: string; organizationId?: string; landingPath?: string }
> {
  const salonName = input.salonName.trim();
  if (salonName.length < 2) {
    return { error: "Salon name must be at least 2 characters" };
  }

  const productIntent = parseProductIntent(input.productIntent);
  if (!productIntent) {
    return { error: "Choose Marketplace, Salon POS, or Both" };
  }

  const location = requireStoreLocation({
    city: input.city,
    country: input.country,
  });
  if (!location.ok) return { error: location.error };

  const explicitSlug = Boolean(input.slug?.trim());
  const rawBase = input.slug?.trim() || salonName;
  let baseSlug = "";

  if (explicitSlug) {
    const validated = validateStoreSlug(rawBase);
    if (!validated.ok) return { error: validated.error };
    baseSlug = validated.slug;
  } else {
    const validated = validateStoreSlug(rawBase);
    if (validated.ok) {
      baseSlug = validated.slug;
    } else {
      // Name mapped to reserved/invalid — force a free suffix candidate base
      const fromName = validateStoreSlug(`${salonName}-salon`);
      if (!fromName.ok) {
        return {
          error:
            "Could not build a booking URL from this salon name. Try a more unique name.",
        };
      }
      baseSlug = fromName.slug;
    }
  }

  const slotMinutes = Number(input.bookingSlotMinutes ?? 30);
  const daysAhead = Number(input.bookingDaysAhead ?? 14);
  const safeSlot = [15, 30, 45, 60].includes(slotMinutes) ? slotMinutes : 30;
  const safeDays = daysAhead >= 7 && daysAhead <= 90 ? daysAhead : 14;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to create a salon" };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY" };
  }

  const { data: existingMembership } = await admin
    .from("organization_members")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existingMembership) {
    return {
      error:
        "This login already belongs to a salon. Staff accounts cannot create a new store — open your dashboard instead.",
    };
  }

  const meta = user.user_metadata ?? {};
  const isStaffAccount =
    meta.account_type === "staff" ||
    meta.created_by_admin === true ||
    Boolean(meta.salon_role);

  if (isStaffAccount) {
    return {
      error:
        "Staff accounts cannot open a new store. Sign in with the credentials your salon owner gave you.",
    };
  }

  if (meta.account_type === "partner") {
    return {
      error:
        "Partner accounts cannot open a salon store. Use the partner dashboard, or sign up with a different email.",
    };
  }

  if (meta.account_type === "customer") {
    return {
      error:
        "Shopper accounts cannot open a salon. Sign up as a salon owner with a different email.",
    };
  }

  const nameTaken = await admin.from("organizations").select("id, name");

  if (nameTaken.error) {
    return { error: nameTaken.error.message };
  }

  const nameClash = (nameTaken.data ?? []).some(
    (o) => o.name.trim().toLowerCase() === salonName.toLowerCase()
  );
  if (nameClash) {
    return { error: "This salon name is already taken. Choose a different name." };
  }

  // Explicit slug request: hard-fail if taken. Name-derived: try suffix variants.
  let slug = baseSlug;
  if (explicitSlug) {
    const { data: clash } = await admin
      .from("organizations")
      .select("id")
      .eq("slug", baseSlug)
      .maybeSingle();
    if (clash) {
      return { error: slugTakenMessage(baseSlug) };
    }
  } else {
    let found = false;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
      if (!validateStoreSlug(candidate).ok) continue;
      const { data: clash } = await admin
        .from("organizations")
        .select("id")
        .eq("slug", candidate)
        .maybeSingle();

      if (!clash) {
        slug = candidate;
        found = true;
        break;
      }
    }
    if (!found) {
      return {
        error:
          "Could not create a free booking URL from this salon name. Try a more unique name.",
      };
    }
  }

  const phone = input.whatsappPhone?.trim() || null;
  const trialEndsAt = new Date();
  trialEndsAt.setUTCDate(trialEndsAt.getUTCDate() + SUBSCRIPTION.trialDays);

  let referredByPartnerId: string | null = null;
  let referralCodeUsed: string | null = null;
  try {
    const { resolveApprovedPartnerByUsername, getRememberedPartnerReferral } =
      await import("@/lib/actions/partners");
    const metaRef =
      typeof meta.partner_referral === "string" ? meta.partner_referral : null;
    const code =
      input.referralCode?.trim() ||
      metaRef ||
      (await getRememberedPartnerReferral()) ||
      null;
    const partner = await resolveApprovedPartnerByUsername(code);
    if (partner) {
      const ownerEmail = (user.email ?? "").toLowerCase();
      const isSelf =
        (partner.user_id && partner.user_id === user.id) ||
        (ownerEmail && partner.email.toLowerCase() === ownerEmail);
      if (!isSelf) {
        referredByPartnerId = partner.id;
        referralCodeUsed = partner.username;
      }
    }
  } catch {
    // Referral is best-effort — never block store creation
  }

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: salonName,
      slug,
      city: location.city,
      country: location.country,
      whatsapp_phone: phone,
      booking_slot_minutes: safeSlot,
      booking_days_ahead: safeDays,
      trial_ends_at: trialEndsAt.toISOString(),
      subscription_status: "trial",
      referred_by_partner_id: referredByPartnerId,
      referral_code_used: referralCodeUsed,
    })
    .select("id, slug")
    .single();

  if (orgError || !org) {
    if (isSlugUniqueViolation(orgError?.message)) {
      return { error: slugUniqueViolationMessage(slug) };
    }
    return { error: orgError?.message ?? "Could not create salon" };
  }

  const { error: memberError } = await admin.from("organization_members").insert({
    organization_id: org.id,
    user_id: user.id,
    role: "OWNER",
  });

  if (memberError) {
    await admin.from("organizations").delete().eq("id", org.id);
    return { error: memberError.message };
  }

  // Empty store on create — services, staff, customers, etc. are added by the salon.

  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      account_type: "owner",
      salon_name: salonName,
      product_intent: productIntent,
      onboarding_completed: true,
      // Clear referral after attribution so it cannot be reused
      partner_referral: null,
    },
  });

  const mode = defaultAppModeForIntent(productIntent);
  const jar = await cookies();
  jar.set(APP_MODE_COOKIE, mode, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const landingPath = landingPathForProductIntent(productIntent);

  revalidatePath("/");
  revalidatePath("/stores");
  revalidatePath("/dashboard");
  revalidatePath("/marketplace");
  revalidatePath("/onboarding");

  return { success: true, slug: org.slug, organizationId: org.id, landingPath };
}

export async function checkSlugAvailable(
  slugInput: string,
  opts?: { excludeOrganizationId?: string; currentSlug?: string }
): Promise<{
  available: boolean;
  slug: string;
  error?: string;
}> {
  const validated = validateStoreSlug(slugInput, {
    allowCurrent: opts?.currentSlug,
  });
  if (!validated.ok) {
    return { available: false, slug: validated.slug, error: validated.error };
  }
  const slug = validated.slug;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { available: false, slug, error: "Server misconfigured" };
  }

  let query = admin.from("organizations").select("id").eq("slug", slug);
  if (opts?.excludeOrganizationId) {
    query = query.neq("id", opts.excludeOrganizationId);
  }
  const { data } = await query.maybeSingle();

  if (data) {
    return { available: false, slug, error: slugTakenMessage(slug) };
  }
  return { available: true, slug };
}

export async function checkSalonNameAvailable(nameInput: string): Promise<{
  available: boolean;
  error?: string;
}> {
  const salonName = nameInput.trim().replace(/\s+/g, " ");
  if (salonName.length < 2) {
    return { available: false, error: "Salon name must be at least 2 characters" };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { available: false, error: "Server misconfigured" };
  }

  const { data, error } = await admin.from("organizations").select("id, name");
  if (error) return { available: false, error: error.message };

  const taken = (data ?? []).some(
    (o) => o.name.trim().toLowerCase() === salonName.toLowerCase()
  );
  if (taken) {
    return {
      available: false,
      error: "This salon name is already taken. Choose a different name.",
    };
  }
  return { available: true };
}
