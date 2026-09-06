import Image from "next/image";
import Link from "next/link";
import { SUBSCRIPTION } from "@/lib/billing/subscription";
import { SYNCOPS } from "@/lib/print/syncops";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=2400&q=80";

export function LandingHero({ storeCount = 0 }: { storeCount?: number }) {
  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-[var(--m-ink)] text-white">
      <div className="absolute inset-0">
        <Image
          src={HERO_IMAGE}
          alt="Salon floor with stylists at work"
          fill
          priority
          sizes="100vw"
          className="m-ken object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(12,31,28,0.92)_0%,rgba(12,31,28,0.68)_48%,rgba(12,31,28,0.35)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(12,31,28,0.72)_0%,transparent_42%)]" />
      </div>

      <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-6 pb-16 pt-[calc(var(--m-chrome)+2.5rem)] sm:pb-20 lg:justify-center lg:pb-24 lg:pt-[calc(var(--m-chrome)+3rem)]">
        <div className="max-w-2xl">
          <p className="m-fade-up font-display text-4xl font-semibold leading-none tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
            {SYNCOPS.name}
          </p>
          <div className="m-rule mt-6 h-px w-24 bg-[var(--m-accent-soft)]" />
          <h1 className="m-fade-up m-fade-up-delay-1 mt-6 font-display text-2xl font-medium leading-snug text-white/95 sm:text-3xl lg:text-4xl">
            The operating system for modern salons.
          </h1>
          <p className="m-fade-up m-fade-up-delay-2 mt-4 max-w-lg text-base leading-relaxed text-white/75 sm:text-lg">
            Bookings, POS, staff, queue, WhatsApp, and reports — one platform per store.
            {storeCount > 0
              ? ` ${storeCount} live salon${storeCount === 1 ? "" : "s"} on Beautora now.`
              : " Open your store and go live in minutes."}{" "}
            First month free, then {SUBSCRIPTION.currencyLabel}{" "}
            {SUBSCRIPTION.monthlyAmountPkr.toLocaleString("en-PK")}/month. Built by{" "}
            <Link href="/syncops" className="text-white underline-offset-4 hover:underline">
              {SYNCOPS.builder.name}
            </Link>
            .
          </p>
          <div className="m-fade-up m-fade-up-delay-3 mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center bg-white px-7 text-sm font-semibold tracking-wide text-[var(--m-ink)] transition-colors hover:bg-[var(--m-mist)]"
            >
              Start 1 month free
            </Link>
            <Link
              href="/#how-it-works"
              className="inline-flex h-12 items-center border border-white/35 px-7 text-sm font-medium tracking-wide text-white transition-colors hover:border-white hover:bg-white/10"
            >
              See how it works
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
