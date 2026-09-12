/**
 * Global SEO constants — Beautora is a worldwide salon SaaS brand.
 * Pakistan is one market, not the global identity.
 */

export const SEO_BRAND = {
  product: "Beautora",
  builder: "SyncOps",
  /** Prefer env NEXT_PUBLIC_SITE_URL; fallback matches production www host. */
  fallbackSiteUrl: "https://www.beautora.app",
  category: "AI-powered salon and beauty-business management platform",
  tagline: "AI-Powered Salon Management Software",
  titleDefault: "Beautora | AI-Powered Salon Management Software",
  titleTemplate: "%s | Beautora",
  /** Default language for global English site */
  htmlLang: "en",
  ogLocale: "en_US",
} as const;

/** Markets we may localize — only publish pages that have unique content. */
export const SEO_MARKETS = [
  { slug: "usa", name: "United States", countryCode: "US", localeHint: "en-US" },
  { slug: "uk", name: "United Kingdom", countryCode: "GB", localeHint: "en-GB" },
  { slug: "uae", name: "United Arab Emirates", countryCode: "AE", localeHint: "en-AE" },
  { slug: "saudi-arabia", name: "Saudi Arabia", countryCode: "SA", localeHint: "en-SA" },
  { slug: "canada", name: "Canada", countryCode: "CA", localeHint: "en-CA" },
  { slug: "australia", name: "Australia", countryCode: "AU", localeHint: "en-AU" },
  { slug: "pakistan", name: "Pakistan", countryCode: "PK", localeHint: "en-PK" },
  { slug: "india", name: "India", countryCode: "IN", localeHint: "en-IN" },
] as const;

export type SeoMarketSlug = (typeof SEO_MARKETS)[number]["slug"];

/** Future locales — hreflang only when real localized pages exist. */
export const SEO_LOCALES = ["en", "ar", "es", "fr", "de"] as const;
