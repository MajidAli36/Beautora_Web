import type { Metadata } from "next";
import Link from "next/link";
import { PlatformFeatures } from "@/components/marketing/platform-features";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { ProductShowcaseSection } from "@/components/marketing/product-showcase-section";
import { LandingFinalCta } from "@/components/marketing/landing-final-cta";
import { buildPageMetadata, SITE_SEO } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";

export const revalidate = 3600;

export const metadata: Metadata = buildPageMetadata({
  title: "Features",
  description: `${SYNCOPS.name} features: online booking, POS, staff & attendance, queue, WhatsApp, inventory, reports, and finances — salon software by ${SYNCOPS.builder.name}.`,
  path: "/features",
  keywords: [
    "Beautora features",
    "salon POS features",
    "online salon booking software",
    "salon management features",
  ],
});

export default function FeaturesPage() {
  return (
    <div className="bg-[var(--m-paper)] pt-[var(--m-chrome)]">
      <div className="border-b border-[var(--m-line)] bg-[var(--m-mist)]">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
            Platform
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-5xl lg:text-6xl">
            Everything your salon needs
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--m-muted)]">
            {SITE_SEO.tagline}. One Beautora workspace for bookings, floor ops, POS, and
            reporting — built by {SYNCOPS.builder.name}.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex h-11 items-center justify-center bg-[var(--m-ink)] px-5 text-sm font-semibold text-white"
            >
              Start free trial
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-11 items-center justify-center border border-[var(--m-line)] px-5 text-sm font-semibold text-[var(--m-ink)]"
            >
              View pricing
            </Link>
          </div>
        </div>
      </div>
      <ProductShowcaseSection />
      <PlatformFeatures />
      <HowItWorksSection />
      <LandingFinalCta />
    </div>
  );
}
