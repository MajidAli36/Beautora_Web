import { buildFaqJsonLd, buildSiteJsonLd, SITE_FAQ } from "@/lib/seo/site";

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** Emits Beautora + SyncOps core graph (no FAQ — FAQ is page-scoped). */
export function SiteJsonLd() {
  return <JsonLd data={buildSiteJsonLd()} />;
}

/** FAQ schema only on pages that show FAQ content. */
export function FaqJsonLd({
  path = "/",
  faqs = SITE_FAQ,
}: {
  path?: string;
  faqs?: readonly { question: string; answer: string }[];
}) {
  return <JsonLd data={buildFaqJsonLd(faqs, path)} />;
}
