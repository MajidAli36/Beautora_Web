import Link from "next/link";
import { BeautoraLogo } from "@/components/brand/beautora-logo";
import { SUBSCRIPTION } from "@/lib/billing/subscription";
import { HeroProductWidget } from "@/components/marketing/hero-product-widget";
import { LandingHeroBackground } from "@/components/marketing/landing-hero-background";

export function LandingHero({ storeCount = 0 }: { storeCount?: number }) {
  return (
    <section
      id="top"
      className="relative min-h-[100svh] overflow-hidden bg-[var(--m-ink)] text-white"
    >
      <LandingHeroBackground />

      <div className="relative mx-auto grid min-h-[100svh] max-w-6xl items-end gap-10 px-6 pb-16 pt-[calc(var(--m-chrome)+2.5rem)] sm:pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-24 lg:pt-[calc(var(--m-chrome)+3rem)]">
        <div className="max-w-xl">
          <div className="m-fade-up flex items-center gap-3">
            <BeautoraLogo size="md" priority className="size-9 drop-shadow-sm" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--m-accent-soft)]">
              Beautora · Salon Management, POS & Marketplace
            </p>
          </div>
          <h1 className="m-fade-up m-fade-up-delay-1 mt-4 font-display text-[2.35rem] font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.35rem]">
            AI-Powered Salon Management,
            <span className="block font-medium text-white/90">POS & Marketplace</span>
          </h1>
          <p className="m-fade-up m-fade-up-delay-2 mt-5 max-w-md text-base leading-relaxed text-white/75 sm:text-lg">
            Online booking, salon POS, CRM, staff, and reports — plus a Marketplace to sell products
            online. Built for beauty businesses worldwide.
          </p>
          <div className="m-fade-up m-fade-up-delay-3 mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
            <Link
              href="/signup?as=owner"
              className="inline-flex h-12 items-center justify-center bg-white px-7 text-sm font-semibold tracking-wide text-[var(--m-ink)] transition-all duration-150 hover:bg-[var(--m-mist)]"
            >
              Start 30 days free
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex h-12 items-center justify-center border border-white/35 px-7 text-sm font-medium tracking-wide text-white transition-all duration-150 hover:border-white hover:bg-white/10"
            >
              See how it works
            </Link>
          </div>
          <p className="m-fade-up m-fade-up-delay-3 mt-5 text-xs tracking-wide text-white/55">
            No card required · {SUBSCRIPTION.trialDays} days free · $
            {SUBSCRIPTION.asiaAmountUsd} Asia or ${SUBSCRIPTION.usdtAmountUsd} elsewhere
            (USDT)
            {` · ${
              storeCount > 100
                ? `${storeCount} live salons`
                : "100+ salons"
            }`}
          </p>
        </div>

        <HeroProductWidget />
      </div>
    </section>
  );
}
