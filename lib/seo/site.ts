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
  titleDefault: `${SYNCOPS.name} | Salon Management Software`,
  titleTemplate: `%s | ${SYNCOPS.name}`,
  description: `Discover ${SYNCOPS.name} — salon management software by ${SYNCOPS.builder.name} for online booking, POS, staff, queue, WhatsApp, and reports. ${SUBSCRIPTION.trialDays} days free, then Rs ${PRICE}/month per store.`,
  shortDescription: `${SYNCOPS.name} — bookings, POS, staff & reports for modern salons. Built by ${SYNCOPS.builder.name}.`,
  keywords: [
    SYNCOPS.name,
    SYNCOPS.builder.name,
    SYNCOPS.domain,
    SYNCOPS.builder.domain,
    "Beautora by SyncOps",
    "SyncOps Beautora",
    "salon software",
    "salon POS",
    "salon POS Pakistan",
    "salon management system",
    "online salon booking",
    "beauty salon software",
    "barbershop POS",
    "salon WhatsApp booking",
    "multi store salon software",
    "JazzCash salon subscription",
    "Majid Ali SyncOps",
    "SyncOps tech",
  ],
  locale: "en_PK",
} as const;

export function absoluteUrl(path = "/"): string {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  noIndex?: boolean;
}): Metadata {
  const url = absoluteUrl(input.path);
  const title = input.title;
  const description = input.description;

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
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
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
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_SEO.titleDefault,
      description: SITE_SEO.description,
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

/** JSON-LD graph: Beautora product + SyncOps organization (SEO for both brands). */
export function buildSiteJsonLd(siteUrl = getSiteUrl()) {
  const syncOpsOrgId = `${SYNCOPS.builder.url}/#organization`;
  const beautoraOrgId = `${siteUrl}/#organization`;
  const softwareId = `${siteUrl}/#software`;
  const websiteId = `${siteUrl}/#website`;
  const ceoId = `${siteUrl}/ceo#person`;

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
        inLanguage: "en-PK",
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
        ],
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Salon management · POS · Online booking",
        operatingSystem: "Web",
        url: siteUrl,
        image: absoluteUrl(SYNCOPS.ceo.photo),
        description: SITE_SEO.description,
        author: { "@id": syncOpsOrgId },
        provider: { "@id": syncOpsOrgId },
        publisher: { "@id": syncOpsOrgId },
        creator: { "@id": syncOpsOrgId },
        brand: { "@id": beautoraOrgId },
        offers: {
          "@type": "Offer",
          url: absoluteUrl("/#pricing"),
          priceCurrency: "PKR",
          price: String(SUBSCRIPTION.monthlyAmountPkr),
          availability: "https://schema.org/InStock",
          description: `1 month free trial, then Rs ${PRICE}/month via JazzCash`,
          seller: { "@id": syncOpsOrgId },
        },
        featureList: [
          "Online booking",
          "POS & sales",
          "Staff & attendance",
          "Queue management",
          "WhatsApp updates",
          "Reports & inventory",
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
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}/#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "What is Beautora?",
            acceptedAnswer: {
              "@type": "Answer",
              text: `Beautora is a salon operating system for bookings, POS, staff, queue, WhatsApp, and reports — a product of SyncOps (${SYNCOPS.builder.domain}).`,
            },
          },
          {
            "@type": "Question",
            name: "Who builds Beautora?",
            acceptedAnswer: {
              "@type": "Answer",
              text: `Beautora is built by SyncOps (${SYNCOPS.builder.domain}), founded by ${SYNCOPS.ceo.name}. Official studio: ${SYNCOPS.builder.url}.`,
            },
          },
          {
            "@type": "Question",
            name: "What is SyncOps?",
            acceptedAnswer: {
              "@type": "Answer",
              text: SYNCOPS.builder.seoDescription,
            },
          },
          {
            "@type": "Question",
            name: "How much does Beautora cost?",
            acceptedAnswer: {
              "@type": "Answer",
              text: `First month free, then Rs ${PRICE}/month via JazzCash per store.`,
            },
          },
        ],
      },
    ],
  };
}
