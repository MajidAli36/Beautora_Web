/**
 * Beautora SEO — backwards-compatible surface.
 * Prefer importing from `@/lib/seo/metadata`, `@/lib/seo/urls`, `@/lib/seo/schema` for new code.
 */

import { SUBSCRIPTION } from "@/lib/billing/subscription";
import { SYNCOPS } from "@/lib/print/syncops";
import { SEO_BRAND } from "@/lib/seo/constants";
import { BEAUTORA_PRODUCT_PAIR } from "@/lib/marketing/products";
import { absoluteUrl, getSiteUrl } from "@/lib/seo/urls";

export { absoluteUrl, canonicalPath, getSiteUrl } from "@/lib/seo/urls";
export { buildPageMetadata, buildRootMetadata } from "@/lib/seo/metadata";
export { SEO_BRAND, SEO_MARKETS, SEO_LOCALES } from "@/lib/seo/constants";

const PRICE_LINE = `$${SUBSCRIPTION.asiaAmountUsd} Asia · $${SUBSCRIPTION.usdtAmountUsd} elsewhere`;

/** Product SEO — Salon Management (POS) + Marketplace. */
export const SITE_SEO = {
  product: SEO_BRAND.product,
  builder: SEO_BRAND.builder,
  tagline: SEO_BRAND.tagline,
  titleDefault: SEO_BRAND.titleDefault,
  titleTemplate: SEO_BRAND.titleTemplate,
  description: `${SEO_BRAND.product} is ${SEO_BRAND.category} by ${SEO_BRAND.builder} — online booking, salon POS, CRM, staff, inventory, queue, WhatsApp, reports, and a product Marketplace with COD checkout. Available internationally; ${SUBSCRIPTION.trialDays}-day free trial.`,
  shortDescription: `${SEO_BRAND.product} — ${BEAUTORA_PRODUCT_PAIR.title}. ${BEAUTORA_PRODUCT_PAIR.subtitle}`,
  keywords: [
    SEO_BRAND.product,
    SEO_BRAND.builder,
    ...BEAUTORA_PRODUCT_PAIR.keywords,
    "beauty salon software",
    "spa management software",
    "barbershop software",
    "salon CRM",
    "salon staff management",
  ],
  locale: SEO_BRAND.ogLocale,
  htmlLang: SEO_BRAND.htmlLang,
} as const;

export const SITE_FAQ = [
  {
    question: "What is Beautora?",
    answer: `Beautora is AI-powered Salon Management, POS & Marketplace by SyncOps — online booking, salon POS, CRM-style customer profiles, staff, queue, inventory, WhatsApp tools, reports, and a product Marketplace with COD checkout for beauty businesses worldwide.`,
  },
  {
    question: "Who is Beautora for?",
    answer:
      "Hair salons, beauty salons, barbershops, spas, nail studios, med spas, and multi-chair beauty clinics that want one workspace for bookings, floor POS, team operations, and online product selling.",
  },
  {
    question: "Does Beautora work outside Pakistan?",
    answer:
      "Yes. Beautora is built for beauty businesses internationally. Country settings select your subscription rate automatically ($10 Asia · $15 elsewhere, USDT).",
  },
  {
    question: "Who builds Beautora?",
    answer: `Beautora is built by SyncOps (${SYNCOPS.builder.domain}), founded by ${SYNCOPS.ceo.name}. Official studio: ${SYNCOPS.builder.url}.`,
  },
  {
    question: "How much does Beautora cost?",
    answer: `Start with a ${SUBSCRIPTION.trialDays}-day free trial. After trial: Asia renews at $${SUBSCRIPTION.asiaAmountUsd}/month; all other countries renew at $${SUBSCRIPTION.usdtAmountUsd}/month — both via USDT on BNB Smart Chain (BEP-20). Upload proof in Billing for SyncOps review.`,
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

/** Pricing-page FAQ only — avoid duplicating full SITE_FAQ rich results on /pricing. */
export const PRICING_FAQ = [
  {
    question: "How much does Beautora cost?",
    answer: `Start with a ${SUBSCRIPTION.trialDays}-day free trial (no card required). After trial, Asia stores renew at $${SUBSCRIPTION.asiaAmountUsd}/month and all other countries at $${SUBSCRIPTION.usdtAmountUsd}/month — both via USDT on BNB Smart Chain (BEP-20).`,
  },
  {
    question: "Is pricing the same worldwide?",
    answer: `No. Beautora uses regional USDT pricing: $${SUBSCRIPTION.asiaAmountUsd}/month for Asia (including Pakistan, India, UAE, and other Asian countries) and $${SUBSCRIPTION.usdtAmountUsd}/month everywhere else. Your store country in Settings selects the rate automatically.`,
  },
  {
    question: "What payment method do you accept?",
    answer:
      "Subscription renewals are paid with USDT on BNB Smart Chain (BEP-20). Upload transfer proof in Billing; SyncOps reviews and unlocks your store for 30 days.",
  },
  {
    question: "Do I need a card to start?",
    answer: `No. New stores get ${SUBSCRIPTION.trialDays} days free with full access. Pay only when you renew after the trial.`,
  },
  {
    question: "Is Marketplace included?",
    answer:
      "Yes. One Beautora subscription covers Salon Management, POS, and Marketplace tools for that store.",
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
          "@type": "AggregateOffer",
          url: absoluteUrl("/pricing"),
          priceCurrency: "USD",
          lowPrice: String(SUBSCRIPTION.asiaAmountUsd),
          highPrice: String(SUBSCRIPTION.usdtAmountUsd),
          offerCount: 2,
          availability: "https://schema.org/InStock",
          description: `${SUBSCRIPTION.trialDays}-day free trial; $${SUBSCRIPTION.asiaAmountUsd}/mo Asia · $${SUBSCRIPTION.usdtAmountUsd}/mo elsewhere (USDT BEP-20)`,
          seller: { "@id": syncOpsOrgId },
          offers: [
            {
              "@type": "Offer",
              name: "Asia plan",
              price: String(SUBSCRIPTION.asiaAmountUsd),
              priceCurrency: "USD",
              url: absoluteUrl("/pricing"),
              availability: "https://schema.org/InStock",
              description: `$${SUBSCRIPTION.asiaAmountUsd}/month USDT for Asia stores`,
            },
            {
              "@type": "Offer",
              name: "International plan",
              price: String(SUBSCRIPTION.usdtAmountUsd),
              priceCurrency: "USD",
              url: absoluteUrl("/pricing"),
              availability: "https://schema.org/InStock",
              description: `$${SUBSCRIPTION.usdtAmountUsd}/month USDT outside Asia`,
            },
          ],
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
export const SEO_PRICE_LABEL = PRICE_LINE;
