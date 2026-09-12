import { SEO_BRAND } from "@/lib/seo/constants";
import { SYNCOPS } from "@/lib/print/syncops";

/** Public site origin for absolute SEO URLs (OG, sitemap, canonical). */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const vercel = process.env.VERCEL_URL?.replace(/\/$/, "");
  if (vercel) return vercel.startsWith("http") ? vercel : `https://${vercel}`;
  return SYNCOPS.url || SEO_BRAND.fallbackSiteUrl;
}

export function absoluteUrl(path = "/"): string {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Self-referencing canonical path (no query string, no trailing slash except root). */
export function canonicalPath(path: string): string {
  if (!path || path === "/") return "/";
  const clean = path.split("?")[0]?.split("#")[0] ?? path;
  return clean.endsWith("/") && clean !== "/" ? clean.slice(0, -1) : clean;
}
