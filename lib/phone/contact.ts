import {
  normalizeBookingEmail,
  normalizeBookingPhone,
} from "@/lib/phone/normalize";

/**
 * Canonical contact phone for salon / marketplace / partner / staff.
 * Same PK-friendly digits as customer booking (`92…` / national forms).
 */
export function normalizeContactPhone(raw: string | null | undefined): string | null {
  return normalizeBookingPhone(raw);
}

/** Lowercase trimmed email — empty / invalid → null. */
export function normalizeContactEmail(raw: string | null | undefined): string | null {
  return normalizeBookingEmail(raw);
}

/** Require a usable phone: at least 7 digits after normalization. */
export function requireContactPhone(
  raw: string | null | undefined
): { ok: true; phone: string } | { ok: false; error: string } {
  const phone = normalizeContactPhone(raw);
  if (!phone) {
    return { ok: false, error: "Phone number is required" };
  }
  if (phone.length < 7 || phone.length > 15) {
    return {
      ok: false,
      error: "Enter a valid phone number (7–15 digits)",
    };
  }
  return { ok: true, phone };
}
