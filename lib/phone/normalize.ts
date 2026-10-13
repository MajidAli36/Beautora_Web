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
export function phoneLookupVariants(normalized: string): string[] {
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
