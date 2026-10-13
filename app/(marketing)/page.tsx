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
import { FaqSection } from "@/components/seo/faq-section";
import { buildPageMetadata, SITE_FAQ, SITE_SEO } from "@/lib/seo/site";
import { defaultVisitorBillingPlan } from "@/lib/billing/visitor-plan";
import Link from "next/link";

export const revalidate = 300;

export const metadata: Metadata = buildPageMetadata({
  title: SITE_SEO.titleDefault,
  description: SITE_SEO.description,
  path: "/",
  absoluteTitle: true,
  keywords: [
    "AI-powered salon management POS marketplace",
    "salon management and marketplace",
    "salon POS software",
    "salon marketplace",
    "salon booking software",
    "salon CRM",
  ],
});

export default async function HomePage() {
  // Default plan (no headers()) so ISR/`revalidate` can cache the homepage.
  const [stores, visitor] = await Promise.all([
    listPublicStores(),
    Promise.resolve(defaultVisitorBillingPlan()),
  ]);

  return (
    <>
      <LandingHero storeCount={stores.length} />
      <TrustBar storeCount={stores.length} />
      <ProblemSolutionSection />
      <ProductShowcaseSection />
      <section className="border-y border-[var(--m-line)] bg-[var(--m-mist)] py-14">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-3xl font-semibold text-[var(--m-ink)]">
            Explore Beautora by need
          </h2>
          <p className="mt-3 max-w-2xl text-[var(--m-muted)]">
            Deep-dive pages for search intent — booking, POS, CRM, staff, inventory, and more.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {[
              ["/salon-management-software", "Salon management"],
              ["/salon-booking-software", "Booking"],
              ["/salon-pos", "POS"],
              ["/salon-crm", "CRM"],
              ["/salon-ai", "Salon AI"],
              ["/ai-receptionist", "AI receptionist"],
              ["/blog", "Blog"],
              ["/tools", "Free tools"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="border border-[var(--m-line)] bg-white px-4 py-2 text-sm font-medium text-[var(--m-ink)] transition-colors hover:border-[var(--m-ink)]"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>
      <PlatformFeatures />
      <HowItWorksSection />
      <StoresSection stores={stores} limit={9} showViewAll />
      <ConfidenceSection />
      <PricingSection
        highlightPlan={visitor.plan}
        detectedCountry={visitor.detected ? visitor.countryCode : null}
      />
      <AppsComingSoonSection />
      <TeamBehindSection />
      <FaqSection path="/" faqs={SITE_FAQ} />
      <LandingFinalCta />
    </>
  );
}
