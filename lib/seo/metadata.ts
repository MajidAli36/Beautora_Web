import type { Metadata } from "next";
import { SEO_BRAND } from "@/lib/seo/constants";
import { BEAUTORA_PRODUCT_PAIR } from "@/lib/marketing/products";
import { absoluteUrl, canonicalPath, getSiteUrl } from "@/lib/seo/urls";
import { SYNCOPS } from "@/lib/print/syncops";

export type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  noIndex?: boolean;
  image?: string | null;
  /** Use absolute title (skip `%s | Beautora` template). */
  absoluteTitle?: boolean;
};

const DEFAULT_KEYWORDS = [
  SEO_BRAND.product,
  SEO_BRAND.builder,
  ...BEAUTORA_PRODUCT_PAIR.keywords,
  "beauty salon software",
  "spa management software",
  "barbershop software",
  "salon CRM",
  "salon staff management",
];

export function buildPageMetadata(input: PageMetadataInput): Metadata {
  const path = canonicalPath(input.path);
  const url = absoluteUrl(path);
  const title = input.title;
  const description = input.description;
  const image = input.image
    ? input.image.startsWith("http")
      ? input.image
      : absoluteUrl(input.image)
    : absoluteUrl("/opengraph-image");

  return {
    title: input.absoluteTitle ? { absolute: title } : title,
    description,
    keywords: input.keywords
      ? [...DEFAULT_KEYWORDS, ...input.keywords]
      : [...DEFAULT_KEYWORDS],
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: SEO_BRAND.ogLocale,
      url,
      siteName: `${SEO_BRAND.product} · ${SEO_BRAND.builder}`,
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
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
      default: SEO_BRAND.titleDefault,
      template: SEO_BRAND.titleTemplate,
    },
    description: `${SEO_BRAND.product} is ${SEO_BRAND.category} by ${SEO_BRAND.builder} — online booking, salon POS, CRM, staff, inventory, reports, and a product Marketplace for beauty businesses worldwide.`,
    applicationName: `${SEO_BRAND.product} by ${SEO_BRAND.builder}`,
    authors: [
      { name: SYNCOPS.builder.name, url: SYNCOPS.builder.url },
      { name: SYNCOPS.ceo.name, url: absoluteUrl("/ceo") },
    ],
    creator: SYNCOPS.builder.name,
    publisher: SYNCOPS.builder.name,
    keywords: [...DEFAULT_KEYWORDS],
    category: "business",
    referrer: "origin-when-cross-origin",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: SEO_BRAND.ogLocale,
      url: siteUrl,
      siteName: `${SEO_BRAND.product} · ${SEO_BRAND.builder}`,
      title: SEO_BRAND.titleDefault,
      description: `${SEO_BRAND.product} — ${SEO_BRAND.tagline}. Salon POS, booking, and Marketplace in one workspace.`,
      images: [{ url: absoluteUrl("/opengraph-image"), width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: SEO_BRAND.titleDefault,
      description: `${SEO_BRAND.product} — ${SEO_BRAND.tagline}.`,
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
      "application-name": `${SEO_BRAND.product} by ${SEO_BRAND.builder}`,
      "theme-color": "#06211d",
      copyright: `${SEO_BRAND.product}. Built by ${SEO_BRAND.builder}`,
      "product:brand": SEO_BRAND.product,
      "product:publisher": SEO_BRAND.builder,
    },
  };
}
