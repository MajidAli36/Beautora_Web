/** Shared slug helpers — safe for client and server. */

/** App / product paths that must never become a store booking slug. */
const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "appointments",
  "attendance",
  "auth",
  "billing",
  "book",
  "ceo",
  "chairs",
  "contact",
  "customers",
  "dashboard",
  "devices",
  "feedback",
  "finances",
  "help",
  "kiosk",
  "login",
  "manifest",
  "onboarding",
  "online-booking",
  "platform",
  "pos",
  "pricing",
  "products",
  "queue",
  "reports",
  "robots",
  "sales",
  "services",
  "settings",
  "signup",
  "sitemap",
  "staff",
  "stores",
  "support",
  "syncops",
  "whatsapp",
  "www",
]);

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

export type SlugValidation =
  | { ok: true; slug: string }
  | { ok: false; slug: string; error: string };

/** Normalize + validate a store booking slug. */
export function validateStoreSlug(
  input: string,
  opts?: { allowCurrent?: string }
): SlugValidation {
  const slug = slugify(input);
  if (!slug) {
    return {
      ok: false,
      slug: "",
      error: "Enter a booking URL (letters, numbers, and hyphens only).",
    };
  }
  if (slug.length < 2) {
    return {
      ok: false,
      slug,
      error: "Booking URL must be at least 2 characters.",
    };
  }
  const keepCurrent = opts?.allowCurrent && slug === opts.allowCurrent;
  if (isReservedSlug(slug) && !keepCurrent) {
    return {
      ok: false,
      slug,
      error: `"${slug}" is reserved by Beautora. Choose a different booking URL.`,
    };
  }
  return { ok: true, slug };
}

export function slugTakenMessage(slug: string): string {
  return `“/${slug}” is already used by another store. Pick a different booking URL — each store needs a unique link.`;
}

export function slugUniqueViolationMessage(slug?: string): string {
  if (slug) return slugTakenMessage(slug);
  return "That booking URL is already taken by another store. Choose a different one.";
}

export function isSlugUniqueViolation(message: string | null | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("organizations_slug_key") ||
    (m.includes("duplicate key") && m.includes("slug")) ||
    (m.includes("unique") && m.includes("slug"))
  );
}
