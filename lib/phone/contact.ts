/** Normalize and validate a contact phone (salon / marketplace / partner). */
export function normalizeContactPhone(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return null;
  return trimmed.replace(/\s+/g, " ");
}

/** Require a usable phone: at least 7 digits after stripping formatting. */
export function requireContactPhone(
  raw: string | null | undefined
): { ok: true; phone: string } | { ok: false; error: string } {
  const phone = normalizeContactPhone(raw);
  if (!phone) {
    return { ok: false, error: "Phone number is required" };
  }
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    return {
      ok: false,
      error: "Enter a valid phone number (7–15 digits)",
    };
  }
  return { ok: true, phone };
}
