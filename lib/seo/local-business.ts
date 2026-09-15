import type { PublicStoreDetail } from "@/lib/actions/stores";
import { currencyFromCountry } from "@/lib/currency/from-country";
import { absoluteUrl, getSiteUrl } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";

type LocalStoreInput = {
  name: string;
  slug: string;
  city?: string | null;
  country?: string | null;
  address?: string | null;
  phone?: string | null;
  whatsappPhone?: string | null;
  email?: string | null;
  tagline?: string | null;
  coverUrl?: string | null;
  fallbackCover?: string | null;
  services?: { name: string; price: number }[];
  publicBookingEnabled?: boolean;
};

function countryCodeFromLocale(locale: string): string | undefined {
  const parts = locale.split("-");
  if (parts.length >= 2 && parts[1]) return parts[1].toUpperCase();
  return undefined;
}

function priceRangeSymbol(currencyCode: string): string {
  if (currencyCode === "PKR") return "₨";
  if (currencyCode === "USD") return "$$";
  if (currencyCode === "GBP") return "££";
  if (currencyCode === "EUR") return "€€";
  if (currencyCode === "AED" || currencyCode === "SAR") return "$$";
  return "$$";
}

/** HairSalon / LocalBusiness JSON-LD for public store + book pages. */
export function buildLocalBusinessJsonLd(store: LocalStoreInput) {
  const siteUrl = getSiteUrl();
  const storeUrl = absoluteUrl(`/stores/${store.slug}`);
  const bookUrl = absoluteUrl(`/book/${store.slug}`);
  const image =
    store.coverUrl ??
    (store.fallbackCover?.startsWith("http")
      ? store.fallbackCover
      : store.fallbackCover
        ? absoluteUrl(store.fallbackCover)
        : absoluteUrl("/opengraph-image"));
  const telephone = store.phone?.trim() || store.whatsappPhone?.trim() || undefined;
  const city = store.city?.trim() || undefined;
  const countryName = store.country?.trim() || undefined;
  const currency = currencyFromCountry(countryName);
  const addressCountry =
    countryCodeFromLocale(currency.locale) ||
    (countryName === "Pakistan" || countryName === "PK" ? "PK" : countryName);

  const graph: Record<string, unknown>[] = [
    {
      "@type": ["HairSalon", "LocalBusiness"],
      "@id": `${storeUrl}#business`,
      name: store.name,
      url: storeUrl,
      image,
      description:
        store.tagline?.trim() ||
        `Book ${store.name}${city ? ` in ${city}` : ""} online with ${SYNCOPS.name}.`,
      telephone,
      email: store.email?.trim() || undefined,
      address: {
        "@type": "PostalAddress",
        streetAddress: store.address?.trim() || undefined,
        addressLocality: city,
        addressCountry: addressCountry || undefined,
      },
      areaServed: city
        ? {
            "@type": "City",
            name: city,
          }
        : undefined,
      priceRange: priceRangeSymbol(currency.code),
      parentOrganization: {
        "@type": "Organization",
        name: SYNCOPS.name,
        url: siteUrl,
      },
      sameAs: store.publicBookingEnabled === false ? [storeUrl] : [storeUrl, bookUrl],
    },
  ];

  if (store.publicBookingEnabled !== false) {
    graph.push({
      "@type": "WebPage",
      "@id": `${bookUrl}#webpage`,
      url: bookUrl,
      name: `Book at ${store.name}`,
      isPartOf: { "@id": `${siteUrl}/#website` },
      about: { "@id": `${storeUrl}#business` },
    });
  }

  if (store.services?.length) {
    graph.push({
      "@type": "ItemList",
      "@id": `${storeUrl}#services`,
      name: `${store.name} services`,
      itemListElement: store.services.slice(0, 20).map((service, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Service",
          name: service.name,
          provider: { "@id": `${storeUrl}#business` },
          offers: {
            "@type": "Offer",
            priceCurrency: currency.code,
            price: String(service.price),
            url: store.publicBookingEnabled === false ? storeUrl : bookUrl,
          },
        },
      })),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export function localBusinessFromDetail(store: PublicStoreDetail) {
  return buildLocalBusinessJsonLd({
    name: store.name,
    slug: store.slug,
    city: store.city,
    country: store.country,
    address: store.address,
    phone: store.phone,
    whatsappPhone: store.whatsappPhone,
    email: store.email,
    tagline: store.tagline,
    coverUrl: store.coverUrl,
    fallbackCover: store.visual.coverImage,
    services: store.services.map((s) => ({ name: s.name, price: s.price })),
    publicBookingEnabled: store.publicBookingEnabled,
  });
}
