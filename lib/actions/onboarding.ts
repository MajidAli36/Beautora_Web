"use server";

import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/onboarding/slug";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types/commerce";

export type CreateOrganizationInput = {
  salonName: string;
  slug?: string;
  whatsappPhone?: string;
  bookingSlotMinutes?: number;
  bookingDaysAhead?: number;
  seedStarterServices?: boolean;
};

export async function createSalonOrganization(
  input: CreateOrganizationInput
): Promise<ActionResult & { slug?: string; organizationId?: string }> {
  const salonName = input.salonName.trim();
  if (salonName.length < 2) {
    return { error: "Salon name must be at least 2 characters" };
  }

  const baseSlug = slugify(input.slug?.trim() || salonName);
  if (!baseSlug) {
    return { error: "Enter a valid salon name or URL slug" };
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

  const nameTaken = await admin
    .from("organizations")
    .select("id, name");

  if (nameTaken.error) {
    return { error: nameTaken.error.message };
  }

  const nameClash = (nameTaken.data ?? []).some(
    (o) => o.name.trim().toLowerCase() === salonName.toLowerCase()
  );
  if (nameClash) {
    return { error: "This salon name is already taken. Choose a different name." };
  }

  let slug = baseSlug;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const { data: clash } = await admin
      .from("organizations")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!clash) {
      slug = candidate;
      break;
    }
    if (attempt === 5) {
      return { error: "That booking URL is taken. Try a different slug." };
    }
  }

  const phone = input.whatsappPhone?.trim() || null;
  const trialEndsAt = new Date();
  trialEndsAt.setUTCDate(trialEndsAt.getUTCDate() + 30);

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: salonName,
      slug,
      whatsapp_phone: phone,
      booking_slot_minutes: safeSlot,
      booking_days_ahead: safeDays,
      trial_ends_at: trialEndsAt.toISOString(),
      subscription_status: "trial",
    })
    .select("id, slug")
    .single();

  if (orgError || !org) {
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

  if (input.seedStarterServices) {
    const { data: cats } = await admin
      .from("service_categories")
      .insert([
        { organization_id: org.id, name: "Hair", sort_order: 1 },
        { organization_id: org.id, name: "Nails", sort_order: 2 },
      ])
      .select("id, name");

    const hairCat = cats?.find((c) => c.name === "Hair")?.id ?? null;
    const nailCat = cats?.find((c) => c.name === "Nails")?.id ?? null;

    await admin.from("services").insert([
      {
        organization_id: org.id,
        category_id: hairCat,
        name: "Haircut",
        price: 1500,
        duration_minutes: 45,
        is_active: true,
      },
      {
        organization_id: org.id,
        category_id: hairCat,
        name: "Hair Color",
        price: 4500,
        duration_minutes: 120,
        is_active: true,
      },
      {
        organization_id: org.id,
        category_id: nailCat,
        name: "Manicure",
        price: 1200,
        duration_minutes: 40,
        is_active: true,
      },
    ]);
  }

  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      salon_name: salonName,
      onboarding_completed: true,
    },
  });

  revalidatePath("/");
  revalidatePath("/stores");
  revalidatePath("/dashboard");
  revalidatePath("/onboarding");

  return { success: true, slug: org.slug, organizationId: org.id };
}

export async function checkSlugAvailable(slugInput: string): Promise<{
  available: boolean;
  slug: string;
  error?: string;
}> {
  const slug = slugify(slugInput);
  if (!slug) return { available: false, slug: "", error: "Enter a valid slug" };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { available: false, slug, error: "Server misconfigured" };
  }

  const { data } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  return { available: !data, slug };
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
