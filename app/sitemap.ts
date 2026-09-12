import type { MetadataRoute } from "next";
import { listPublicStores, listPublicStoreCities } from "@/lib/actions/stores";
import { getAllBlogSlugs } from "@/lib/seo/content/blog";
import { getPublishedMarketSlugs } from "@/lib/seo/content/markets";
import { getAllSeoPillarPaths } from "@/lib/seo/content/registry";
import { absoluteUrl, cityToSlug, getSiteUrl } from "@/lib/seo/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/salon-management-software"), lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: absoluteUrl("/pricing"), lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: absoluteUrl("/features"), lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: absoluteUrl("/how-it-works"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/stores"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/book"), lastModified: now, changeFrequency: "weekly", priority: 0.75 },
    { url: absoluteUrl("/blog"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/tools"), lastModified: now, changeFrequency: "monthly", priority: 0.75 },
    { url: absoluteUrl("/tools/salon-no-show-calculator"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/tools/salon-commission-calculator"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/contact"), lastModified: now, changeFrequency: "monthly", priority: 0.65 },
    { url: absoluteUrl("/syncops"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/ceo"), lastModified: now, changeFrequency: "monthly", priority: 0.65 },
    { url: absoluteUrl("/partner"), lastModified: now, changeFrequency: "monthly", priority: 0.65 },
    { url: absoluteUrl("/apps"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/privacy"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/terms"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/signup"), lastModified: now, changeFrequency: "monthly", priority: 0.55 },
  ];

  const pillarRoutes: MetadataRoute.Sitemap = getAllSeoPillarPaths()
    .filter((path) => path !== "/salon-management-software")
    .map((path) => ({
      url: absoluteUrl(path),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    }));

  const marketRoutes: MetadataRoute.Sitemap = getPublishedMarketSlugs().map((market) => ({
    url: absoluteUrl(`/salon-management-software/${market}`),
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const blogRoutes: MetadataRoute.Sitemap = getAllBlogSlugs().map((slug) => ({
    url: absoluteUrl(`/blog/${slug}`),
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  let storeRoutes: MetadataRoute.Sitemap = [];
  let cityRoutes: MetadataRoute.Sitemap = [];
  try {
    const [stores, cities] = await Promise.all([
      listPublicStores(),
      listPublicStoreCities(),
    ]);
    storeRoutes = stores.flatMap((store) => [
      {
        url: absoluteUrl(`/stores/${store.slug}`),
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      },
      {
        url: absoluteUrl(`/book/${store.slug}`),
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.72,
      },
    ]);
    cityRoutes = cities.map((city) => ({
      url: absoluteUrl(`/stores/in/${cityToSlug(city)}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    }));
  } catch {
    // Static routes still ship
  }

  return [
    ...staticRoutes,
    ...pillarRoutes,
    ...marketRoutes,
    ...blogRoutes,
    ...cityRoutes,
    ...storeRoutes,
  ];
}
