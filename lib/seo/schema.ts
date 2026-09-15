/**
 * Schema helpers — re-export from site / studio / local-business for a stable import path.
 * Prefer importing builders from here in new page code.
 */

export {
  buildSiteJsonLd,
  buildFaqJsonLd,
  buildBreadcrumbJsonLd,
  SITE_FAQ,
  PRICING_FAQ,
} from "@/lib/seo/site";

export {
  buildLocalBusinessJsonLd,
  localBusinessFromDetail,
} from "@/lib/seo/local-business";

export {
  buildSyncOpsPageJsonLd,
  buildCeoPageJsonLd,
} from "@/lib/seo/studio";
