import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_PAYMENT_INSTRUCTIONS =
  "Send your advance via JazzCash, EasyPaisa, or bank transfer using the accounts shown on this page, then upload a clear payment screenshot. We confirm your booking after review.";

type AdminClient = SupabaseClient;

/**
 * Ensures at least one active stylist is bookable online.
 * If none are flagged yet, enables all active staff (fixes new salons / SyncOPS).
 */
export async function ensureOnlineBookableStaff(
  admin: AdminClient,
  organizationId: string
): Promise<{ id: string; full_name: string; job_title: string | null }[]> {
  const { data: enabled } = await admin
    .from("staff")
    .select("id, full_name, job_title")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .eq("online_booking_enabled", true)
    .is("deleted_at", null)
    .order("full_name");

  if (enabled?.length) return enabled;

  const { data: active } = await admin
    .from("staff")
    .select("id, full_name, job_title")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("full_name");

  if (!active?.length) return [];

  await admin
    .from("staff")
    .update({ online_booking_enabled: true })
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .is("deleted_at", null);

  return active;
}

/**
 * Reads salon online-advance settings as configured (no auto-default %).
 * Amount and percent of 0 means no advance is required.
 * Fills empty payment instructions only when an advance is configured.
 */
export async function ensureOnlineAdvanceDefaults(
  admin: AdminClient,
  org: {
    id: string;
    booking_advance_amount?: number | null;
    booking_advance_percent?: number | null;
    booking_payment_instructions?: string | null;
  }
): Promise<{
  booking_advance_amount: number;
  booking_advance_percent: number;
  booking_payment_instructions: string | null;
}> {
  const amount = Number(org.booking_advance_amount ?? 0);
  const percent = Number(org.booking_advance_percent ?? 0);
  const existingInstructions = org.booking_payment_instructions?.trim() || null;

  if ((amount > 0 || percent > 0) && !existingInstructions) {
    await admin
      .from("organizations")
      .update({ booking_payment_instructions: DEFAULT_PAYMENT_INSTRUCTIONS })
      .eq("id", org.id);

    return {
      booking_advance_amount: amount,
      booking_advance_percent: percent,
      booking_payment_instructions: DEFAULT_PAYMENT_INSTRUCTIONS,
    };
  }

  return {
    booking_advance_amount: amount,
    booking_advance_percent: percent,
    booking_payment_instructions: existingInstructions,
  };
}

export { DEFAULT_PAYMENT_INSTRUCTIONS };
