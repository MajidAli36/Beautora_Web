/** Partner referral helpers */

export const PARTNER_REF_COOKIE = "beautora_partner_ref";
/** Client-side backup so ref survives browsing even if cookie refresh is needed. */
export const PARTNER_REF_STORAGE_KEY = "beautora_partner_ref";
/** Keep attribution for 90 days (sliding when re-visited). */
export const PARTNER_REF_MAX_AGE_DAYS = 90;

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

/** Primary share link — opens signup with partner credited. */
export function partnerReferralSignupPath(username: string): string {
  return `/signup?ref=${encodeURIComponent(normalizePartnerUsername(username))}`;
}

/** Website home with ref — browsing still remembers the partner. */
export function partnerReferralSitePath(username: string): string {
  return `/?ref=${encodeURIComponent(normalizePartnerUsername(username))}`;
}

/** Partner landing with ref — apply page still attributes future signup. */
export function partnerReferralPartnerPath(username: string): string {
  return `/partner?ref=${encodeURIComponent(normalizePartnerUsername(username))}`;
}

export function readPartnerRefFromSearch(search: string | URLSearchParams): string | null {
  const params =
    typeof search === "string" ? new URLSearchParams(search) : search;
  const raw = params.get("ref")?.trim();
  if (!raw) return null;
  const validated = validatePartnerUsername(raw);
  return validated.ok ? validated.username : normalizePartnerUsername(raw);
}
