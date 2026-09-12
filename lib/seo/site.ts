/**
 * Beautora SEO — backwards-compatible surface.
 * Prefer importing from `@/lib/seo/metadata`, `@/lib/seo/urls`, `@/lib/seo/schema` for new code.
 */

import { SUBSCRIPTION } from "@/lib/billing/subscription";
import { SYNCOPS } from "@/lib/print/syncops";
import { SEO_BRAND } from "@/lib/seo/constants";
import { absoluteUrl, getSiteUrl } from "@/lib/seo/urls";

export { absoluteUrl, canonicalPath, getSiteUrl } from "@/lib/seo/urls";
export { buildPageMetadata, buildRootMetadata } from "@/lib/seo/metadata";
export { SEO_BRAND, SEO_MARKETS, SEO_LOCALES } from "@/lib/seo/constants";

const PRICE = SUBSCRIPTION.monthlyAmountPkr.toLocaleString("en-PK");

/** Product SEO — global brand; Pakistan is one market, not the identity. */
export const SITE_SEO = {
  product: SEO_BRAND.product,
  builder: SEO_BRAND.builder,
  tagline: SEO_BRAND.tagline,
  titleDefault: SEO_BRAND.titleDefault,
  titleTemplate: SEO_BRAND.titleTemplate,
  description: `${SEO_BRAND.product} is an AI-powered salon management platform by ${SEO_BRAND.builder} for beauty businesses worldwide — online booking, POS, CRM, staff, inventory, queue, WhatsApp tools, and reports. Available internationally; ${SUBSCRIPTION.trialDays}-day free trial.`,
  shortDescription: `${SEO_BRAND.product} — ${SEO_BRAND.tagline}. Booking, POS, CRM, staff & analytics for modern beauty businesses.`,
  keywords: [
    SEO_BRAND.product,
    SEO_BRAND.builder,
    "AI-powered salon management software",
    "salon management software",
    "salon booking software",
    "salon POS",
    "salon CRM",
    "beauty salon software",
    "spa management software",
    "barbershop software",
    "online salon booking",
    "salon staff management",
  ],
  locale: SEO_BRAND.ogLocale,
  htmlLang: SEO_BRAND.htmlLang,
} as const;

export const SITE_FAQ = [
  {
    question: "What is Beautora?",
    answer: `Beautora is an AI-powered salon and beauty-business management platform by SyncOps — online booking, POS, CRM-style customer profiles, staff, queue, inventory, WhatsApp tools, and reports for salons worldwide.`,
  },
  {
    question: "Who is Beautora for?",
    answer:
      "Hair salons, beauty salons, barbershops, spas, nail studios, med spas, and multi-chair beauty clinics that want one system for bookings, checkout, and team operations.",
  },
  {
    question: "Does Beautora work outside Pakistan?",
    answer:
      "Yes. Beautora is built for beauty businesses internationally. Country and currency settings support global stores; local payment options (such as JazzCash in Pakistan) apply where configured.",
  },
  {
    question: "Who builds Beautora?",
    answer: `Beautora is built by SyncOps (${SYNCOPS.builder.domain}), founded by ${SYNCOPS.ceo.name}. Official studio: ${SYNCOPS.builder.url}.`,
  },
  {
    question: "How much does Beautora cost?",
    answer: `Start with a ${SUBSCRIPTION.trialDays}-day free trial. After trial: Pakistan renews at Rs ${SUBSCRIPTION.monthlyAmountPkr.toLocaleString("en-PK")}/month via JazzCash; other countries renew at $${SUBSCRIPTION.usdtAmountUsd} USDT on BNB Smart Chain (BEP-20). Upload proof in Billing for SyncOps review.`,
  },
  {
    question: "Can customers book online?",
    answer:
      "Yes. Each store can publish a booking page and optional public listing so guests can choose services, stylists, and times online.",
  },
  {
    question: "Does Beautora include AI?",
    answer:
      "Beautora includes AI-assisted marketing help on the public site (optional). Core product automates booking, floor ops, and reporting. Advanced AI receptionist features are positioned honestly as evolving capabilities — not voice-call magic that does not exist yet.",
  },
] as const;

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

/** Core site graph — FAQ is separate (only on pages with visible FAQ UI). */
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
          SEO_BRAND.tagline,
        ],
        description: SITE_SEO.description,
        publisher: { "@id": syncOpsOrgId },
        creator: { "@id": syncOpsOrgId },
        about: { "@id": beautoraOrgId },
        inLanguage: SITE_SEO.htmlLang,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl}/stores?q={search_term_string}`,
          },
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
        description: SITE_SEO.description,
        parentOrganization: { "@id": syncOpsOrgId },
        logo: absoluteUrl(SYNCOPS.logo),
        sameAs: [
          SYNCOPS.url,
          absoluteUrl("/syncops"),
          SYNCOPS.builder.url,
          absoluteUrl("/ceo"),
          absoluteUrl("/salon-management-software"),
        ],
        brand: {
          "@type": "Brand",
          name: SYNCOPS.name,
          slogan: SITE_SEO.tagline,
        },
        areaServed: "Worldwide",
      },
      {
        "@type": "SoftwareApplication",
        "@id": softwareId,
        name: SYNCOPS.name,
        alternateName: [
          `${SYNCOPS.name} by ${SYNCOPS.builder.name}`,
          SEO_BRAND.tagline,
          "Salon management software",
          "Salon booking software",
          "Salon POS software",
        ],
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Salon management · POS · Online booking · CRM",
        operatingSystem: "Web",
        url: siteUrl,
        image: ogImage,
        description: SITE_SEO.description,
        author: { "@id": syncOpsOrgId },
        provider: { "@id": syncOpsOrgId },
        publisher: { "@id": syncOpsOrgId },
        creator: { "@id": syncOpsOrgId },
        brand: { "@id": beautoraOrgId },
        offers: {
          "@type": "Offer",
          url: absoluteUrl("/pricing"),
          priceCurrency: "PKR",
          price: String(SUBSCRIPTION.monthlyAmountPkr),
          availability: "https://schema.org/InStock",
          description: `${SUBSCRIPTION.trialDays}-day free trial; see pricing for regional payment options`,
          seller: { "@id": syncOpsOrgId },
        },
        featureList: [
          "Online salon booking",
          "Salon POS and sales",
          "Customer profiles (CRM)",
          "Staff and attendance",
          "Queue management",
          "WhatsApp messaging tools",
          "Inventory and reports",
          "Public store directory",
        ],
        sameAs: [
          absoluteUrl("/salon-management-software"),
          absoluteUrl("/salon-booking-software"),
          absoluteUrl("/salon-pos"),
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

export function buildBreadcrumbJsonLd(
  items: readonly { name: string; path: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Kept for any legacy import; prefer SUBSCRIPTION display on pricing page. */
export const SEO_PRICE_LABEL = `Rs ${PRICE}`;
