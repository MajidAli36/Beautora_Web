import type { Metadata } from "next";
import Link from "next/link";
import { PricingSection } from "@/components/marketing/pricing-section";
import { LandingFinalCta } from "@/components/marketing/landing-final-cta";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { FaqSection } from "@/components/seo/faq-section";
import { buildPageMetadata, PRICING_FAQ, SITE_SEO } from "@/lib/seo/site";
import { SUBSCRIPTION } from "@/lib/billing/subscription";
import { defaultVisitorBillingPlan } from "@/lib/billing/visitor-plan";
import { SYNCOPS } from "@/lib/print/syncops";

export const revalidate = 300;

export const metadata: Metadata = buildPageMetadata({
  title: "Pricing",
  description: `${SYNCOPS.name} pricing for Salon Management, POS & Marketplace worldwide — ${SUBSCRIPTION.trialDays} days free trial, then $${SUBSCRIPTION.asiaAmountUsd}/month (Asia) or $${SUBSCRIPTION.usdtAmountUsd}/month (elsewhere) via USDT BEP-20.`,
  path: "/pricing",
  keywords: [
    "Beautora pricing",
    "salon software pricing",
    "salon POS subscription",
    "salon marketplace pricing",
    "Beautora USDT pricing",
  ],
});

export default async function PricingPage() {
  // Static-friendly default — both plans are always listed; highlight Asia by default.
  const visitor = defaultVisitorBillingPlan();

  return (
    <div className="bg-[var(--m-paper)] m-under-chrome">
      <div className="border-b border-[var(--m-line)] bg-[var(--m-mist)]">
        <div className="mx-auto max-w-6xl px-6 pt-6 pb-14 sm:pt-8 sm:pb-20">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "Pricing", path: "/pricing" },
            ]}
          />
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
            Pricing
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-5xl lg:text-6xl">
            Simple per-store pricing
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--m-muted)]">
            {SITE_SEO.product} includes Salon Management, POS & Marketplace — booking, floor
            checkout, staff, queue, WhatsApp tools, reports, and online product selling — with
            regional USDT pricing (${SUBSCRIPTION.asiaAmountUsd} Asia · $
            {SUBSCRIPTION.usdtAmountUsd} elsewhere).
          </p>
          <p className="mt-6 text-sm text-[var(--m-muted)]">
            Looking for features first?{" "}
            <Link
              href="/features"
              className="font-medium text-[var(--m-ink)] underline-offset-4 hover:underline"
            >
              See the platform
            </Link>
            .
          </p>
        </div>
      </div>
      <PricingSection
        highlightPlan={visitor.plan}
        detectedCountry={visitor.detected ? visitor.countryCode : null}
      />
      <FaqSection path="/pricing" faqs={PRICING_FAQ} />
      <LandingFinalCta />
    </div>
  );
}
