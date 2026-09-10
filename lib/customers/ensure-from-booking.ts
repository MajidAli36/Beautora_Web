/**
 * Ensure a customer row exists for booking flows (in-house + online).
 * Match by phone first, then email; create or fill missing profile fields.
 */

export type BookingPersonInput = {
  firstName: string;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  /** Optional note stored on the customer profile when creating / filling blanks. */
  notes?: string | null;
};

export type EnsureCustomerResult =
  | { customerId: string; created: boolean }
  | { error: string };

type CustomerRow = {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

/** Minimal Supabase-like client used by server + admin. */
type DbClient = {
  from: (table: string) => any;
};

/** Digits-only PK-friendly phone for storage and comparison. */
export function normalizeBookingPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  // Pakistan mobile: 03XXXXXXXXX → 92XXXXXXXXXX
  if (digits.startsWith("0") && digits.length === 11) {
    return `92${digits.slice(1)}`;
  }
  // Pakistan without leading 0: 3XXXXXXXXX
  if (digits.length === 10 && digits.startsWith("3")) {
    return `92${digits}`;
  }
  // Already international 92…
  if (digits.startsWith("92") && digits.length >= 12) {
    return digits;
  }
  return digits;
}

/** Lookup forms so 0301… / 92301… / 301… match the same customer. */
function phoneLookupVariants(normalized: string): string[] {
  const variants = new Set<string>([normalized]);
  if (normalized.startsWith("92") && normalized.length >= 12) {
    const national = normalized.slice(2);
    variants.add(`0${national}`);
    variants.add(national);
  } else if (normalized.startsWith("0") && normalized.length >= 11) {
    variants.add(`92${normalized.slice(1)}`);
    variants.add(normalized.slice(1));
  }
  return [...variants];
}

export function normalizeBookingEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) return null;
  return trimmed;
}

/**
 * Find-or-create customer for an appointment booking.
 * Always returns a customer id when firstName is present.
 */
export async function ensureCustomerFromBooking(
  client: DbClient,
  organizationId: string,
  person: BookingPersonInput
): Promise<EnsureCustomerResult> {
  const firstName = person.firstName.trim();
  if (!firstName) {
    return { error: "Customer first name is required" };
  }

  const lastName = person.lastName?.trim() || null;
  const phone = normalizeBookingPhone(person.phone);
  const email = normalizeBookingEmail(person.email);
  const notes = person.notes?.trim() || null;

  let existing: CustomerRow | null = null;

  if (phone) {
    const variants = phoneLookupVariants(phone);
    const { data } = await client
      .from("customers")
      .select("id, first_name, last_name, phone, email, notes")
      .eq("organization_id", organizationId)
      .in("phone", variants)
      .is("deleted_at", null)
      .limit(1);
    const rows = (data as CustomerRow[] | null) ?? [];
    existing = rows[0] ?? null;
  }

  if (!existing && email) {
    const { data } = await client
      .from("customers")
      .select("id, first_name, last_name, phone, email, notes")
      .eq("organization_id", organizationId)
      .ilike("email", email)
      .is("deleted_at", null)
      .maybeSingle();
    existing = (data as CustomerRow | null) ?? null;
  }

  if (existing) {
    const patch: Record<string, string | null> = {};
    if (!existing.last_name && lastName) patch.last_name = lastName;
    if (!existing.phone && phone) patch.phone = phone;
    if (!existing.email && email) patch.email = email;
    if (!existing.notes && notes) patch.notes = notes;
    // Keep a stronger name if they only had a placeholder / single letter
    if (
      firstName.length > 1 &&
      existing.first_name.trim().length <= 1
    ) {
      patch.first_name = firstName;
    }

    if (Object.keys(patch).length > 0) {
      await client
        .from("customers")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .eq("organization_id", organizationId);
    }

    return { customerId: existing.id, created: false };
  }

  const { data: created, error } = await client
    .from("customers")
    .insert({
      organization_id: organizationId,
      first_name: firstName,
      last_name: lastName,
      phone,
      email,
      notes,
      tags: [],
    })
    .select("id")
    .single();

  if (error || !created) {
    return { error: error?.message ?? "Failed to create customer" };
  }

  return { customerId: created.id as string, created: true };
}
