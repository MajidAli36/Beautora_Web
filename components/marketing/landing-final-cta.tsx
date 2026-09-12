import Link from "next/link";
import { BeautoraLogo } from "@/components/brand/beautora-logo";
import { SUBSCRIPTION } from "@/lib/billing/subscription";
import { SYNCOPS } from "@/lib/print/syncops";

export function LandingFinalCta() {
  return (
    <section className="bg-[var(--m-mist)] py-28 sm:py-32">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <div className="mb-6 flex justify-center">
          <BeautoraLogo size="lg" />
        </div>
        <h2 className="font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-5xl lg:text-6xl">
          Ready to run your salon on {SYNCOPS.name}?
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-[var(--m-muted)]">
          Start with the full platform for {SUBSCRIPTION.trialDays} days. Then Rs{" "}
          {SUBSCRIPTION.monthlyAmountPkr.toLocaleString("en-PK")}/month in Pakistan (JazzCash) or $
          {SUBSCRIPTION.usdtAmountUsd} USDT internationally (BEP-20).
        </p>
        <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            href="/signup"
            className="inline-flex h-12 items-center justify-center bg-[var(--m-ink)] px-8 text-sm font-semibold tracking-wide text-[var(--m-paper)] transition-all duration-150 hover:bg-[var(--m-ink-soft)]"
          >
            Start 30 days free
          </Link>
          <Link
            href="/pricing"
            className="inline-flex h-12 items-center justify-center border border-[var(--m-ink)] px-8 text-sm font-medium tracking-wide text-[var(--m-ink)] transition-all duration-150 hover:bg-[var(--m-ink)] hover:text-[var(--m-paper)]"
          >
            View pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
