import { COMMERCIAL_PAGES } from "@/lib/seo/content/commercial";
import { INDUSTRY_PAGES } from "@/lib/seo/content/industries";
import type { CommercialPage } from "@/lib/seo/content/commercial";

const BY_SLUG = new Map<string, CommercialPage>(
  [...COMMERCIAL_PAGES, ...INDUSTRY_PAGES].map((p) => [p.slug, p])
);

export function getSeoPillarPage(slug: string): CommercialPage | undefined {
  return BY_SLUG.get(slug);
}

export function getAllSeoPillarSlugs(): string[] {
  // Hub lives at app/(marketing)/salon-management-software/page.tsx (needed for market children).
  return [...BY_SLUG.keys()].filter((slug) => slug !== "salon-management-software");
}

export function getAllSeoPillarPaths(): string[] {
  return [...BY_SLUG.values()].map((p) => p.path);
}
