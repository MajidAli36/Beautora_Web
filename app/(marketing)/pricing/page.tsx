import type { Metadata } from "next";
import Link from "next/link";
import { PricingSection } from "@/components/marketing/pricing-section";
import { LandingFinalCta } from "@/components/marketing/landing-final-cta";
import { FaqJsonLd } from "@/components/seo/json-ld";
import { buildPageMetadata, SITE_FAQ, SITE_SEO } from "@/lib/seo/site";
import { SUBSCRIPTION } from "@/lib/billing/subscription";
import { SYNCOPS } from "@/lib/print/syncops";

export const revalidate = 3600;

const PRICE = SUBSCRIPTION.monthlyAmountPkr.toLocaleString("en-PK");

export const metadata: Metadata = buildPageMetadata({
  title: "Pricing",
  description: `${SYNCOPS.name} pricing: ${SUBSCRIPTION.trialDays} days free, then Rs ${PRICE}/month per store via JazzCash. Salon POS, online booking, staff, and reports by ${SYNCOPS.builder.name}.`,
  path: "/pricing",
  keywords: [
    "Beautora pricing",
    "salon software price Pakistan",
    "salon POS subscription",
    "JazzCash salon software",
  ],
});

export default function PricingPage() {
  return (
    <div className="bg-[var(--m-paper)] pt-[var(--m-chrome)]">
      <FaqJsonLd path="/pricing" faqs={SITE_FAQ} />
      <div className="border-b border-[var(--m-line)] bg-[var(--m-mist)]">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
            Pricing
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-5xl lg:text-6xl">
            Simple per-store pricing
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--m-muted)]">
            {SITE_SEO.product} gives every salon a full operating system — booking, POS,
            staff, queue, WhatsApp, and reports — with a clear monthly plan.
          </p>
          <p className="mt-6 text-sm text-[var(--m-muted)]">
            Looking for features first?{" "}
            <Link href="/features" className="font-medium text-[var(--m-ink)] underline-offset-4 hover:underline">
              See the platform
            </Link>
            .
          </p>
        </div>
      </div>
      <PricingSection />
      <LandingFinalCta />
    </div>
  );
}
