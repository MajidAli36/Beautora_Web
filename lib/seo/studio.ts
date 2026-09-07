import { absoluteUrl, getSiteUrl } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";

/** Canonical SyncOps + CEO identity URLs used for SEO sameAs / backlinks. */
export const SYNCOPS_SEO_LINKS = {
  studioSite: SYNCOPS.builder.url,
  studioPage: absoluteUrl("/syncops"),
  productSite: SYNCOPS.url,
  ceoPage: absoluteUrl("/ceo"),
  linkedin: SYNCOPS.ceo.links.linkedin,
  github: SYNCOPS.ceo.links.github,
  personalSite: SYNCOPS.ceo.links.website,
  email: SYNCOPS.ceo.links.email,
} as const;

export function syncOpsSameAs(): string[] {
  return [
    SYNCOPS_SEO_LINKS.studioSite,
    SYNCOPS_SEO_LINKS.studioPage,
    SYNCOPS_SEO_LINKS.productSite,
    SYNCOPS_SEO_LINKS.ceoPage,
    SYNCOPS_SEO_LINKS.linkedin,
    SYNCOPS_SEO_LINKS.github,
    SYNCOPS_SEO_LINKS.personalSite,
  ];
}

export function ceoSameAs(): string[] {
  return [
    SYNCOPS_SEO_LINKS.ceoPage,
    SYNCOPS_SEO_LINKS.personalSite,
    SYNCOPS_SEO_LINKS.linkedin,
    SYNCOPS_SEO_LINKS.github,
    SYNCOPS_SEO_LINKS.studioSite,
    SYNCOPS_SEO_LINKS.studioPage,
    SYNCOPS_SEO_LINKS.productSite,
  ];
}

export function buildSyncOpsPageJsonLd() {
  const siteUrl = getSiteUrl();
  const pageUrl = absoluteUrl("/syncops");
  const orgId = `${SYNCOPS.builder.url}/#organization`;
  const pageId = `${pageUrl}#webpage`;
  const ceoId = `${absoluteUrl("/ceo")}#person`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId,
        name: SYNCOPS.builder.name,
        legalName: SYNCOPS.builder.name,
        url: SYNCOPS.builder.url,
        email: SYNCOPS.email,
        telephone: SYNCOPS.phone,
        description: `${SYNCOPS.builder.name} is the product studio behind ${SYNCOPS.name} — salon POS, online booking, and operations software.`,
        logo: absoluteUrl(SYNCOPS.ceo.photo),
        sameAs: syncOpsSameAs(),
        founder: { "@id": ceoId },
        brand: {
          "@type": "Brand",
          name: SYNCOPS.name,
          url: SYNCOPS.url,
        },
      },
      {
        "@type": "WebPage",
        "@id": pageId,
        url: pageUrl,
        name: `${SYNCOPS.builder.name} — Product studio behind ${SYNCOPS.name}`,
        description: `${SYNCOPS.builder.name} builds software that runs real businesses. ${SYNCOPS.name} is our salon operating system.`,
        isPartOf: { "@id": `${siteUrl}/#website` },
        about: { "@id": orgId },
        primaryImageOfPage: absoluteUrl(SYNCOPS.ceo.photo),
        inLanguage: "en-PK",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: SYNCOPS.name,
            item: siteUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: SYNCOPS.builder.name,
            item: pageUrl,
          },
        ],
      },
    ],
  };
}

export function buildCeoPageJsonLd() {
  const siteUrl = getSiteUrl();
  const pageUrl = absoluteUrl("/ceo");
  const orgId = `${SYNCOPS.builder.url}/#organization`;
  const personId = `${pageUrl}#person`;
  const pageId = `${pageUrl}#webpage`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        "@id": pageId,
        url: pageUrl,
        name: `${SYNCOPS.ceo.name} — Founder & CEO of ${SYNCOPS.builder.name}`,
        description: `${SYNCOPS.ceo.name} is Founder & CEO of ${SYNCOPS.builder.name}, the product studio behind ${SYNCOPS.name}.`,
        mainEntity: { "@id": personId },
        isPartOf: { "@id": `${siteUrl}/#website` },
        about: { "@id": personId },
        inLanguage: "en-PK",
      },
      {
        "@type": "Person",
        "@id": personId,
        name: SYNCOPS.ceo.name,
        jobTitle: SYNCOPS.ceo.role,
        image: absoluteUrl(SYNCOPS.ceo.photo),
        url: pageUrl,
        email: SYNCOPS.ceo.links.email,
        sameAs: ceoSameAs(),
        worksFor: {
          "@type": "Organization",
          "@id": orgId,
          name: SYNCOPS.builder.name,
          url: SYNCOPS.builder.url,
          sameAs: syncOpsSameAs(),
        },
        knowsAbout: [
          "Salon software",
          "SaaS product leadership",
          "POS systems",
          "Online booking platforms",
          SYNCOPS.name,
          SYNCOPS.builder.name,
        ],
        description: `${SYNCOPS.ceo.name}, Founder & CEO of ${SYNCOPS.builder.name} — makers of ${SYNCOPS.name} (${SYNCOPS.domain}).`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: SYNCOPS.name,
            item: siteUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: SYNCOPS.builder.name,
            item: absoluteUrl("/syncops"),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: SYNCOPS.ceo.name,
            item: pageUrl,
          },
        ],
      },
    ],
  };
}
