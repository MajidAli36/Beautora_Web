import Link from "next/link";
import { BeautoraLogo } from "@/components/brand/beautora-logo";
import { HeroProductWidget } from "@/components/marketing/hero-product-widget";
import { LandingHeroBackground } from "@/components/marketing/landing-hero-background";

export function LandingHero({ storeCount = 0 }: { storeCount?: number }) {
  const salonLine =
    storeCount > 100 ? `${storeCount} live salons` : "Salons worldwide";

  return (
    <section
      id="top"
      className="relative isolate overflow-x-clip bg-[var(--m-ink)] text-white lg:min-h-[calc(100svh-var(--m-chrome))]"
    >
      <LandingHeroBackground />

      <div className="m-hero-grid relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-8 px-4 py-8 sm:gap-10 sm:px-6 sm:py-10 lg:min-h-[calc(100svh-var(--m-chrome))] lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-x-10 lg:py-12">
        <div className="max-w-xl min-w-0">
          <div className="m-fade-up flex items-center gap-2.5">
            <BeautoraLogo size="md" priority className="size-9 shrink-0 drop-shadow-sm sm:size-10" />
            <p className="font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Beautora
            </p>
          </div>

          <p className="m-fade-up m-fade-up-delay-1 mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--m-accent)] sm:tracking-[0.24em]">
            Salon management · POS · Marketplace
          </p>

          <h1 className="m-fade-up m-fade-up-delay-1 mt-2.5 font-display text-[clamp(1.85rem,4.5vw,3rem)] font-semibold leading-[1.1] tracking-tight text-white">
            Run your beauty business from one calm workspace.
          </h1>

          <p className="m-fade-up m-fade-up-delay-2 mt-4 max-w-md text-sm leading-relaxed text-white/78 sm:text-base">
            Bookings, walk-ins, checkout, staff, customers, and online product sales —
            connected so owners see the floor and the numbers without juggling apps.
          </p>

          <div className="m-fade-up m-fade-up-delay-3 mt-6 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:flex-wrap">
            <Link href="/signup?as=owner" className="m-btn m-btn-light w-full sm:w-auto">
              Start free
            </Link>
            <Link href="/how-it-works" className="m-btn m-btn-ghost w-full sm:w-auto">
              See how it works
            </Link>
          </div>

          <p className="m-fade-up m-fade-up-delay-3 mt-4 text-[11px] leading-relaxed tracking-wide text-white/55">
            No card required · Full platform trial · {salonLine}
          </p>
        </div>

        <div className="m-hero-widget min-w-0 w-full lg:justify-self-end">
          <HeroProductWidget />
        </div>
      </div>
    </section>
  );
}
