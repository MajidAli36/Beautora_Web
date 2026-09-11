import type { Metadata } from "next";
import Link from "next/link";
import { PlatformFeatures } from "@/components/marketing/platform-features";
import { ProductShowcaseSection } from "@/components/marketing/product-showcase-section";
import { LandingFinalCta } from "@/components/marketing/landing-final-cta";
import { buildPageMetadata, SITE_SEO } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";

export const revalidate = 3600;

export const metadata: Metadata = buildPageMetadata({
  title: "Salon Platform — Booking, POS & Team",
  description: `Beautora is the best salon management platform for Pakistan and global beauty businesses — online booking, POS, staff, queue, WhatsApp, inventory, and reports by ${SYNCOPS.builder.name}.`,
  path: "/platform",
  keywords: [
    "salon platform",
    "best salon software Pakistan",
    "salon management platform",
    "beauty salon POS software",
    "salon operating system",
    "Beautora platform",
  ],
});

export default function PlatformPage() {
  return (
    <div className="bg-[var(--m-paper)] pt-[var(--m-chrome)]">
      <div className="border-b border-[var(--m-line)] bg-[var(--m-mist)]">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
            Platform
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-5xl lg:text-6xl">
            The salon operating system
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--m-muted)]">
            {SITE_SEO.tagline}. One Beautora workspace for front desk, floor, and back office —
            used by modern salons searching for the best salon software in Pakistan and worldwide.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex h-11 items-center justify-center bg-[var(--m-ink)] px-5 text-sm font-semibold text-white"
            >
              Start free trial
            </Link>
            <Link
              href="/features"
              className="inline-flex h-11 items-center justify-center border border-[var(--m-line)] px-5 text-sm font-semibold text-[var(--m-ink)]"
            >
              See features
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-11 items-center justify-center border border-[var(--m-line)] px-5 text-sm font-semibold text-[var(--m-ink)]"
            >
              Pricing
            </Link>
          </div>
        </div>
      </div>
      <ProductShowcaseSection />
      <PlatformFeatures />
      <LandingFinalCta />
    </div>
  );
}
