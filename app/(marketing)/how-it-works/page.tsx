import type { Metadata } from "next";
import Link from "next/link";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { LandingFinalCta } from "@/components/marketing/landing-final-cta";
import { ConfidenceSection } from "@/components/marketing/confidence-section";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { buildPageMetadata } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";

export const revalidate = 3600;

export const metadata: Metadata = buildPageMetadata({
  title: "How Beautora Works",
  description: `See how ${SYNCOPS.name} Salon Management, POS & Marketplace works: open your store, set services and staff, run bookings and POS, then sell products online — trusted by salons worldwide.`,
  path: "/how-it-works",
  keywords: [
    "how Beautora works",
    "salon POS setup",
    "salon marketplace setup",
    "salon management how to start",
    "online salon booking setup",
  ],
});

export default function HowItWorksPage() {
  return (
    <div className="bg-[var(--m-paper)] m-under-chrome">
      <div className="border-b border-[var(--m-line)] bg-[var(--m-mist)]">
        <div className="mx-auto max-w-6xl px-6 pt-6 pb-14 sm:pt-8 sm:pb-20">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "How it works", path: "/how-it-works" },
            ]}
          />
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
            How it works
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-5xl lg:text-6xl">
            From signup to a live salon floor
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--m-muted)]">
            Watch the walkthrough in English or Urdu — or follow the written tutorial below. Then
            open bookings, salon POS, team ops, and Marketplace from one Beautora workspace. Built
            by {SYNCOPS.builder.name}.
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
