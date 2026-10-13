/**
 * Ensure a customer row exists for booking flows (in-house + online).
 * Match by phone first, then email; create, restore soft-deleted, or fill blanks.
 */

import {
  normalizeBookingEmail,
  normalizeBookingPhone,
  phoneLookupVariants,
} from "@/lib/phone/normalize";

export {
  normalizeBookingEmail,
  normalizeBookingPhone,
  phoneLookupVariants,
} from "@/lib/phone/normalize";

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
  deleted_at?: string | null;
};

/** Minimal Supabase-like client used by server + admin. */
type DbClient = {
  from: (table: string) => any;
};

async function findByPhone(
  client: DbClient,
  organizationId: string,
  phone: string,
  includeDeleted: boolean
): Promise<CustomerRow | null> {
  const variants = phoneLookupVariants(phone);
  let query = client
    .from("customers")
    .select("id, first_name, last_name, phone, email, notes, deleted_at")
    .eq("organization_id", organizationId)
    .in("phone", variants)
    .order("created_at", { ascending: false })
    .limit(1);
  if (!includeDeleted) {
    query = query.is("deleted_at", null);
  } else {
    query = query.not("deleted_at", "is", null);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(`Customer phone lookup failed: ${error.message}`);
  }
  const rows = (data as CustomerRow[] | null) ?? [];
  return rows[0] ?? null;
}

async function findByEmail(
  client: DbClient,
  organizationId: string,
  email: string,
  includeDeleted: boolean
): Promise<CustomerRow | null> {
  let query = client
    .from("customers")
    .select("id, first_name, last_name, phone, email, notes, deleted_at")
    .eq("organization_id", organizationId)
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1);
  if (!includeDeleted) {
    query = query.is("deleted_at", null);
  } else {
    query = query.not("deleted_at", "is", null);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(`Customer email lookup failed: ${error.message}`);
  }
  const rows = (data as CustomerRow[] | null) ?? [];
  return rows[0] ?? null;
}

async function applyProfilePatch(
  client: DbClient,
  organizationId: string,
  existing: CustomerRow,
  patch: {
    firstName: string;
    lastName: string | null;
    phone: string | null;
    email: string | null;
    notes: string | null;
    restore?: boolean;
  }
) {
  const next: Record<string, string | null> = {};
  if (patch.restore) {
    next.deleted_at = null;
  }
  if (!existing.last_name && patch.lastName) next.last_name = patch.lastName;
  if ((!existing.phone || patch.restore) && patch.phone) next.phone = patch.phone;
  else if (patch.phone && existing.phone && existing.phone !== patch.phone) {
    // Normalize stored phone when we know the canonical form
    next.phone = patch.phone;
  }
  if ((!existing.email || patch.restore) && patch.email) next.email = patch.email;
  if (!existing.notes && patch.notes) next.notes = patch.notes;
  if (
    patch.firstName.length > 1 &&
    (patch.restore || existing.first_name.trim().length <= 1)
  ) {
    next.first_name = patch.firstName;
  } else if (patch.restore && patch.firstName) {
    next.first_name = patch.firstName;
  }

  if (Object.keys(next).length === 0) return;

  const { data: patched, error } = await client
    .from("customers")
    .update({ ...next, updated_at: new Date().toISOString() })
    .eq("id", existing.id)
    .eq("organization_id", organizationId)
    .select("id, deleted_at")
    .maybeSingle();
  if (error) {
    throw new Error(`Customer profile update failed: ${error.message}`);
  }
  if (patch.restore && patched?.deleted_at) {
    throw new Error("Could not restore soft-deleted customer");
  }
}

/**
 * Find-or-create customer for an appointment booking.
 * Always returns a customer id when firstName is present.
 * Soft-deleted matches are restored instead of creating a twin.
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

  try {
    let existing: CustomerRow | null = null;
    let restored = false;

    if (phone) {
      existing = await findByPhone(client, organizationId, phone, false);
    }
    if (!existing && email) {
      existing = await findByEmail(client, organizationId, email, false);
    }

    // Soft-deleted match → restore instead of inventing a duplicate.
    if (!existing && phone) {
      const deleted = await findByPhone(client, organizationId, phone, true);
      if (deleted) {
        existing = deleted;
        restored = true;
      }
    }
    if (!existing && email) {
      const deleted = await findByEmail(client, organizationId, email, true);
      if (deleted) {
        existing = deleted;
        restored = true;
      }
    }

    if (existing) {
      await applyProfilePatch(client, organizationId, existing, {
        firstName,
        lastName,
        phone,
        email,
        notes,
        restore: restored,
      });
      return { customerId: existing.id, created: restored };
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
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to ensure customer",
    };
  }
}
