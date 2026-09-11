import type { Metadata } from "next";
import { SUBSCRIPTION } from "@/lib/billing/subscription";
import { SYNCOPS } from "@/lib/print/syncops";

/** Public site origin for absolute SEO URLs (OG, sitemap, canonical). */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const vercel = process.env.VERCEL_URL?.replace(/\/$/, "");
  if (vercel) return vercel.startsWith("http") ? vercel : `https://${vercel}`;
  return SYNCOPS.url;
}

const PRICE = SUBSCRIPTION.monthlyAmountPkr.toLocaleString("en-PK");

/** Product SEO — Beautora (salon OS) + SyncOps (studio). */
export const SITE_SEO = {
  product: SYNCOPS.name,
  builder: SYNCOPS.builder.name,
  tagline: "The operating system for modern salons",
  titleDefault: `${SYNCOPS.name} | Best Salon Software in Pakistan & Worldwide`,
  titleTemplate: `%s | ${SYNCOPS.name}`,
  description: `${SYNCOPS.name} is salon management software by ${SYNCOPS.builder.name} for beauty businesses in Pakistan and worldwide — online booking, POS, staff, queue, WhatsApp, and reports. ${SUBSCRIPTION.trialDays} days free, then Rs ${PRICE}/month per store. Discover and book live salons online.`,
  shortDescription: `${SYNCOPS.name} — best salon software for booking, POS, staff & reports in Pakistan and worldwide. Built by ${SYNCOPS.builder.name}.`,
  keywords: [
    SYNCOPS.name,
    SYNCOPS.builder.name,
    "best salon software Pakistan",
    "best salon software",
    "best salon management software",
    "salon software Pakistan",
    "salon POS Pakistan",
    "salon management system",
    "online salon booking Pakistan",
    "beauty salon software",
    "best beauty salon software",
    "barbershop POS",
    "book salon online Pakistan",
    "best salon in Pakistan",
    "salon software worldwide",
    "JazzCash salon subscription",
  ],
  locale: "en_PK",
  htmlLang: "en-PK",
} as const;

export const SITE_FAQ = [
  {
    question: "What is Beautora?",
    answer: `Beautora is a salon operating system for bookings, POS, staff, queue, WhatsApp, and reports — a product of SyncOps (${SYNCOPS.builder.domain}). It helps salons in Pakistan and worldwide run modern beauty businesses.`,
  },
  {
    question: "Is Beautora good for salons in Pakistan?",
    answer: `Yes. Beautora is Pakistan-ready with JazzCash billing, Pakistan timezone booking, PKR pricing, and a public stores directory so guests can find and book salons online.`,
  },
  {
    question: "Who builds Beautora?",
    answer: `Beautora is built by SyncOps (${SYNCOPS.builder.domain}), founded by ${SYNCOPS.ceo.name}. Official studio: ${SYNCOPS.builder.url}.`,
  },
  {
    question: "What is SyncOps?",
    answer: SYNCOPS.builder.seoDescription,
  },
  {
    question: "How much does Beautora cost?",
    answer: `First ${SUBSCRIPTION.trialDays} days free, then Rs ${PRICE}/month via JazzCash per store.`,
  },
  {
    question: "Can customers book online?",
    answer:
      "Yes. Each store gets a public booking page and optional public store listing so guests searching for salons in Pakistan or elsewhere can book services and stylists online.",
  },
  {
    question: "Where can I find salons on Beautora?",
    answer: `Browse live salons on beautora.app/stores, filter by city, open a store page, and book online.`,
  },
] as const;

export function absoluteUrl(path = "/"): string {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function cityToSlug(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugToCityLabel(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  noIndex?: boolean;
  image?: string | null;
}): Metadata {
  const url = absoluteUrl(input.path);
  const title = input.title;
  const description = input.description;
  const image = input.image
    ? input.image.startsWith("http")
      ? input.image
      : absoluteUrl(input.image)
    : absoluteUrl("/opengraph-image");

  return {
    title,
    description,
    keywords: input.keywords
      ? [...SITE_SEO.keywords, ...input.keywords]
      : [...SITE_SEO.keywords],
    alternates: { canonical: input.path },
    openGraph: {
      type: "website",
      locale: SITE_SEO.locale,
      url,
      siteName: `${SITE_SEO.product} · ${SITE_SEO.builder}`,
      title,
      description,
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    robots: input.noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
}

export function buildRootMetadata(): Metadata {
  const siteUrl = getSiteUrl();
  const verificationToken = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: SITE_SEO.titleDefault,
      template: SITE_SEO.titleTemplate,
    },
    description: SITE_SEO.description,
    applicationName: `${SITE_SEO.product} by ${SITE_SEO.builder}`,
    authors: [
      { name: SYNCOPS.builder.name, url: SYNCOPS.builder.url },
      { name: SYNCOPS.ceo.name, url: absoluteUrl("/ceo") },
    ],
    creator: SYNCOPS.builder.name,
    publisher: SYNCOPS.builder.name,
    keywords: [...SITE_SEO.keywords],
    category: "business",
    referrer: "origin-when-cross-origin",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      locale: SITE_SEO.locale,
      url: siteUrl,
      siteName: `${SITE_SEO.product} · ${SITE_SEO.builder}`,
      title: SITE_SEO.titleDefault,
      description: SITE_SEO.description,
      images: [{ url: absoluteUrl("/opengraph-image") }],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_SEO.titleDefault,
      description: SITE_SEO.description,
      images: [absoluteUrl("/opengraph-image")],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    verification: verificationToken
      ? {
          google: verificationToken,
        }
      : undefined,
    other: {
      "application-name": `${SITE_SEO.product} by ${SITE_SEO.builder}`,
      "msapplication-TileColor": "#0f172a",
      "theme-color": "#0f172a",
      copyright: `${SITE_SEO.product}. Built by ${SITE_SEO.builder} (${SYNCOPS.builder.domain})`,
      "product:brand": SITE_SEO.product,
      "product:publisher": SITE_SEO.builder,
    },
  };
}

/** Core site graph — FAQ is intentionally separate (only on FAQ-visible pages). */
export function buildSiteJsonLd(siteUrl = getSiteUrl()) {
  const syncOpsOrgId = `${SYNCOPS.builder.url}/#organization`;
  const beautoraOrgId = `${siteUrl}/#organization`;
  const softwareId = `${siteUrl}/#software`;
  const websiteId = `${siteUrl}/#website`;
  const ceoId = `${siteUrl}/ceo#person`;
  const ogImage = absoluteUrl("/opengraph-image");

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: siteUrl,
        name: SITE_SEO.product,
        alternateName: [
          `${SITE_SEO.product} by ${SITE_SEO.builder}`,
          SITE_SEO.builder,
          SYNCOPS.builder.short,
        ],
        description: SITE_SEO.description,
        publisher: { "@id": syncOpsOrgId },
        creator: { "@id": syncOpsOrgId },
        about: { "@id": beautoraOrgId },
        inLanguage: SITE_SEO.htmlLang,
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/stores?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": syncOpsOrgId,
        name: SYNCOPS.builder.name,
        legalName: SYNCOPS.builder.name,
        url: SYNCOPS.builder.url,
        email: SYNCOPS.ceo.links.email,
        telephone: SYNCOPS.phone,
        logo: absoluteUrl(SYNCOPS.ceo.photo),
        sameAs: [
          SYNCOPS.builder.url,
          absoluteUrl("/syncops"),
          SYNCOPS.url,
          absoluteUrl("/ceo"),
          SYNCOPS.ceo.links.linkedin,
          SYNCOPS.ceo.links.github,
          SYNCOPS.ceo.links.website,
        ],
        description: SYNCOPS.builder.seoDescription,
        founder: { "@id": ceoId },
        brand: { "@id": beautoraOrgId },
        makesOffer: {
          "@type": "Offer",
          itemOffered: { "@id": softwareId },
        },
      },
      {
        "@type": "Organization",
        "@id": beautoraOrgId,
        name: SYNCOPS.name,
        legalName: SYNCOPS.name,
        url: siteUrl,
        email: SYNCOPS.email,
        telephone: SYNCOPS.phone,
        description: SYNCOPS.seoDescription,
        parentOrganization: { "@id": syncOpsOrgId },
        logo: ogImage,
        sameAs: [
          SYNCOPS.url,
          absoluteUrl("/syncops"),
          SYNCOPS.builder.url,
          absoluteUrl("/ceo"),
        ],
        brand: {
          "@type": "Brand",
          name: SYNCOPS.name,
          slogan: SITE_SEO.tagline,
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": softwareId,
        name: SYNCOPS.name,
        alternateName: [
          `${SYNCOPS.name} by ${SYNCOPS.builder.name}`,
          `${SYNCOPS.name} Salon Platform`,
          "Best salon software Pakistan",
          "Salon management software",
          "Beauty salon POS software",
        ],
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Salon management · POS · Online booking",
        operatingSystem: "Web",
        url: siteUrl,
        image: ogImage,
        description: SITE_SEO.description,
        author: { "@id": syncOpsOrgId },
        provider: { "@id": syncOpsOrgId },
        publisher: { "@id": syncOpsOrgId },
        creator: { "@id": syncOpsOrgId },
        brand: { "@id": beautoraOrgId },
        audience: {
          "@type": "Audience",
          geographicArea: [
            { "@type": "Country", name: "Pakistan" },
            { "@type": "AdministrativeArea", name: "Worldwide" },
          ],
        },
        offers: {
          "@type": "Offer",
          url: absoluteUrl("/pricing"),
          priceCurrency: "PKR",
          price: String(SUBSCRIPTION.monthlyAmountPkr),
          availability: "https://schema.org/InStock",
          description: `${SUBSCRIPTION.trialDays} days free trial, then Rs ${PRICE}/month via JazzCash`,
          seller: { "@id": syncOpsOrgId },
        },
        featureList: [
          "Online salon booking",
          "Salon POS and sales",
          "Staff and attendance",
          "Queue management",
          "WhatsApp updates",
          "Inventory and reports",
          "Public store directory",
        ],
        sameAs: [
          absoluteUrl("/salon-software"),
          absoluteUrl("/salon-platform"),
          absoluteUrl("/features"),
          absoluteUrl("/stores"),
        ],
      },
      {
        "@type": "Person",
        "@id": ceoId,
        name: SYNCOPS.ceo.name,
        jobTitle: SYNCOPS.ceo.role,
        image: absoluteUrl(SYNCOPS.ceo.photo),
        url: absoluteUrl("/ceo"),
        email: SYNCOPS.ceo.links.email,
        sameAs: [
          absoluteUrl("/ceo"),
          SYNCOPS.ceo.links.website,
          SYNCOPS.ceo.links.linkedin,
          SYNCOPS.ceo.links.github,
          SYNCOPS.builder.url,
          absoluteUrl("/syncops"),
          SYNCOPS.url,
        ],
        worksFor: { "@id": syncOpsOrgId },
        description: `${SYNCOPS.ceo.name}, ${SYNCOPS.ceo.role} of ${SYNCOPS.builder.name} — makers of ${SYNCOPS.name}.`,
      },
    ],
  };
}

export function buildFaqJsonLd(
  faqs: readonly { question: string; answer: string }[] = SITE_FAQ,
  pagePath = "/"
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${absoluteUrl(pagePath)}#faq`,
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
