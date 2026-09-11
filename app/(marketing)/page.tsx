import type { Metadata } from "next";
import { listPublicStores } from "@/lib/actions/stores";
import { LandingHero } from "@/components/marketing/landing-hero";
import { TrustBar } from "@/components/marketing/trust-bar";
import { ProblemSolutionSection } from "@/components/marketing/problem-solution-section";
import { ProductShowcaseSection } from "@/components/marketing/product-showcase-section";
import { PlatformFeatures } from "@/components/marketing/platform-features";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { StoresSection } from "@/components/marketing/stores-section";
import { ConfidenceSection } from "@/components/marketing/confidence-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { AppsComingSoonSection } from "@/components/marketing/apps-coming-soon-section";
import { TeamBehindSection } from "@/components/marketing/team-behind-section";
import { LandingFinalCta } from "@/components/marketing/landing-final-cta";
import { FaqJsonLd } from "@/components/seo/json-ld";
import { buildPageMetadata, SITE_SEO } from "@/lib/seo/site";

/** Public marketing homepage — revalidate so crawlers get fast HTML. */
export const revalidate = 300;

export const metadata: Metadata = buildPageMetadata({
  title: SITE_SEO.titleDefault,
  description: SITE_SEO.description,
  path: "/",
});

export default async function HomePage() {
  const stores = await listPublicStores();

  return (
    <>
      <FaqJsonLd path="/" />
      <LandingHero storeCount={stores.length} />
      <TrustBar storeCount={stores.length} />
      <ProblemSolutionSection />
      <ProductShowcaseSection />
      <PlatformFeatures />
      <HowItWorksSection />
      <StoresSection stores={stores} limit={9} showViewAll />
      <ConfidenceSection />
      <PricingSection />
      <AppsComingSoonSection />
      <TeamBehindSection />
      <LandingFinalCta />
    </>
  );
}
