import type { Metadata } from "next";
import Link from "next/link";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { LandingFinalCta } from "@/components/marketing/landing-final-cta";
import { ConfidenceSection } from "@/components/marketing/confidence-section";
import { buildPageMetadata, SITE_SEO } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";

export const revalidate = 3600;

export const metadata: Metadata = buildPageMetadata({
  title: "How Beautora Works",
  description: `See how ${SYNCOPS.name} salon software works: open your store, set services and staff, then run bookings, POS, and reports — trusted by salons in Pakistan and worldwide.`,
  path: "/how-it-works",
  keywords: [
    "how Beautora works",
    "salon software setup",
    "salon management how to start",
    "online salon booking setup Pakistan",
    "best salon software for beginners",
  ],
});

export default function HowItWorksPage() {
  return (
    <div className="bg-[var(--m-paper)] pt-[var(--m-chrome)]">
      <div className="border-b border-[var(--m-line)] bg-[var(--m-mist)]">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
            How it works
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-5xl lg:text-6xl">
            From signup to a live salon floor
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--m-muted)]">
            {SITE_SEO.product} is built for beauty businesses in Pakistan and abroad — a clear path
            from empty store to daily bookings, POS, and team ops. Built by {SYNCOPS.builder.name}.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex h-11 items-center justify-center bg-[var(--m-ink)] px-5 text-sm font-semibold text-white"
            >
              Start free trial
            </Link>
            <Link
              href="/salon-platform"
              className="inline-flex h-11 items-center justify-center border border-[var(--m-line)] px-5 text-sm font-semibold text-[var(--m-ink)]"
            >
              Explore platform
            </Link>
          </div>
        </div>
      </div>
      <HowItWorksSection />
      <ConfidenceSection />
      <LandingFinalCta />
    </div>
  );
}
