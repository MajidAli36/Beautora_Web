import type { Metadata } from "next";
import Link from "next/link";
import { FaqJsonLd } from "@/components/seo/json-ld";
import { LandingFinalCta } from "@/components/marketing/landing-final-cta";
import { PlatformFeatures } from "@/components/marketing/platform-features";
import { PricingSection } from "@/components/marketing/pricing-section";
import { buildPageMetadata, SITE_FAQ, SITE_SEO } from "@/lib/seo/site";
import { SUBSCRIPTION } from "@/lib/billing/subscription";
import { SYNCOPS } from "@/lib/print/syncops";

export const revalidate = 3600;

const PRICE = SUBSCRIPTION.monthlyAmountPkr.toLocaleString("en-PK");

export const metadata: Metadata = buildPageMetadata({
  title: "Best Salon Software in Pakistan & Worldwide",
  description: `Looking for the best salon software in Pakistan or worldwide? Beautora by SyncOps is salon management software for online booking, POS, staff, queue, WhatsApp, and reports. ${SUBSCRIPTION.trialDays} days free, then Rs ${PRICE}/month.`,
  path: "/salon-software",
  keywords: [
    "best salon software Pakistan",
    "best salon software",
    "best salon management software",
    "salon software worldwide",
    "beauty salon software Pakistan",
    "barbershop software Pakistan",
    "online salon booking Pakistan",
    "salon POS software",
    "best beauty salon software",
    "salon management system Pakistan",
  ],
});

const PILLAR_FAQ = [
  ...SITE_FAQ,
  {
    question: "Is Beautora the best salon software for Pakistan?",
    answer: `Beautora is built for Pakistan-first operations — JazzCash billing, Pakistan timezone booking, PKR pricing, and public store pages so guests can find and book salons online — while remaining usable for salons worldwide.`,
  },
  {
    question: "Can guests find the best salons on Beautora?",
    answer: `Yes. Browse live salons on the Beautora stores directory, filter by city, open a store menu, and book online — powered by SyncOps.`,
  },
] as const;

export default function SalonSoftwarePage() {
  return (
    <div className="bg-[var(--m-paper)] pt-[var(--m-chrome)]">
      <FaqJsonLd path="/salon-software" faqs={PILLAR_FAQ} />
      <div className="border-b border-[var(--m-line)] bg-[var(--m-mist)]">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
            Salon software
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-5xl lg:text-6xl">
            Best salon software for Pakistan &amp; the world
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--m-muted)]">
            {SITE_SEO.product} is the salon operating system from {SYNCOPS.builder.name} — built so
            beauty businesses rank, book, and run better. Owners get POS, staff, queue, WhatsApp,
            and reports; guests discover and book live stores online.
          </p>
          <ul className="mt-8 max-w-xl space-y-2 text-sm text-[var(--m-ink-soft)]">
            <li>· Online booking + public store pages for local discovery</li>
            <li>· POS, staff attribution, attendance, and queue for the floor</li>
            <li>· Pakistan-ready billing (JazzCash) with a clear monthly plan</li>
            <li>· Built for salons searching for modern software worldwide</li>
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex h-11 items-center justify-center bg-[var(--m-ink)] px-5 text-sm font-semibold text-white"
            >
              Start free trial
            </Link>
            <Link
              href="/stores"
              className="inline-flex h-11 items-center justify-center border border-[var(--m-line)] px-5 text-sm font-semibold text-[var(--m-ink)]"
            >
              Browse salons
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
      <PlatformFeatures />
      <PricingSection />
      <LandingFinalCta />
    </div>
  );
}
