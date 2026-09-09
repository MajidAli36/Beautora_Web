import type { MetadataRoute } from "next";
import { listPublicStores } from "@/lib/actions/stores";
import { absoluteUrl, getSiteUrl } from "@/lib/seo/site";

/** Indexable public URLs only — no auth, dashboard, or noindex pages. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: absoluteUrl("/stores"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/book"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: absoluteUrl("/about"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/contact"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/syncops"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/ceo"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: absoluteUrl("/partner"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: absoluteUrl("/apps"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.65,
    },
    {
      url: absoluteUrl("/privacy"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: absoluteUrl("/terms"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: absoluteUrl("/signup"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.55,
    },
  ];

  let storeRoutes: MetadataRoute.Sitemap = [];
  try {
    const stores = await listPublicStores();
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
        priority: 0.75,
      },
    ]);
  } catch {
    // Sitemap still ships static routes if store listing fails
  }

  return [...staticRoutes, ...storeRoutes];
}
