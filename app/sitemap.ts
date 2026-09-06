import type { MetadataRoute } from "next";
import { listPublicStores } from "@/lib/actions/stores";
import { absoluteUrl, getSiteUrl } from "@/lib/seo/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
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
      url: absoluteUrl("/syncops"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/ceo"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: absoluteUrl("/signup"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/login"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
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
