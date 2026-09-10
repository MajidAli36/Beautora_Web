import { WORLD_COUNTRIES, type WorldCountry } from "@/lib/location/countries";

/** Store location labels — used for directory filters and future country/city grouping. */

export const DEFAULT_STORE_COUNTRY: WorldCountry = "Pakistan";

/**
 * Full country dropdown list.
 * Pakistan first (default market), then A–Z for every other country.
 */
export const STORE_COUNTRY_OPTIONS: readonly string[] = [
  DEFAULT_STORE_COUNTRY,
  ...WORLD_COUNTRIES.filter((c) => c !== DEFAULT_STORE_COUNTRY),
];

export type StoreCountryOption = (typeof STORE_COUNTRY_OPTIONS)[number];

/** Trim + collapse spaces for stable grouping keys. */
export function normalizeLocationLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeStoreCity(value: string): string {
  return normalizeLocationLabel(value);
}

export function normalizeStoreCountry(value: string): string {
  const normalized = normalizeLocationLabel(value);
  if (!normalized) return "";
  const match = STORE_COUNTRY_OPTIONS.find(
    (c) => c.toLowerCase() === normalized.toLowerCase()
  );
  return match ?? normalized;
}

export type StoreLocationFields = {
  city: string;
  country: string;
};

/**
 * Require city + country for onboarding / profile saves.
 * Returns normalized values or an error message.
 */
export function requireStoreLocation(input: {
  city?: string | null;
  country?: string | null;
}): { ok: true; city: string; country: string } | { ok: false; error: string } {
  const city = normalizeStoreCity(input.city ?? "");
  const country = normalizeStoreCountry(input.country ?? "");

  if (city.length < 2) {
    return { ok: false, error: "City is required (at least 2 characters)." };
  }
  if (country.length < 2) {
    return { ok: false, error: "Country is required." };
  }
  if (
    !STORE_COUNTRY_OPTIONS.some((c) => c.toLowerCase() === country.toLowerCase())
  ) {
    return { ok: false, error: "Please select a country from the list." };
  }

  return { ok: true, city, country };
}
