/** Partner referral helpers */

export const PARTNER_REF_COOKIE = "beautora_partner_ref";
export const PARTNER_REF_MAX_AGE_DAYS = 30;

export function normalizePartnerUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "_");
}

export function validatePartnerUsername(raw: string): {
  ok: true;
  username: string;
} | { ok: false; error: string } {
  const username = normalizePartnerUsername(raw);
  if (username.length < 3) {
    return { ok: false, error: "Username must be at least 3 characters" };
  }
  if (username.length > 32) {
    return { ok: false, error: "Username must be 32 characters or fewer" };
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return {
      ok: false,
      error: "Username can only use letters, numbers, and underscores",
    };
  }
  if (/^[0-9]+$/.test(username)) {
    return { ok: false, error: "Username must include at least one letter" };
  }
  const reserved = new Set([
    "admin",
    "syncops",
    "beautora",
    "partner",
    "partners",
    "support",
    "help",
    "root",
  ]);
  if (reserved.has(username)) {
    return { ok: false, error: "This username is reserved" };
  }
  return { ok: true, username };
}

export function partnerReferralSignupPath(username: string): string {
  return `/signup?ref=${encodeURIComponent(normalizePartnerUsername(username))}`;
}
