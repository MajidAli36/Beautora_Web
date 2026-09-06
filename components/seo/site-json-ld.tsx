import { buildSiteJsonLd } from "@/lib/seo/site";

/** Emits Beautora + SyncOps JSON-LD for search engines */
export function SiteJsonLd() {
  const jsonLd = buildSiteJsonLd();
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
