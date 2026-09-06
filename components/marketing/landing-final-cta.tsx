import Link from "next/link";
import { SUBSCRIPTION } from "@/lib/billing/subscription";
import { SYNCOPS } from "@/lib/print/syncops";

export function LandingFinalCta() {
  return (
    <section className="relative overflow-hidden bg-[var(--m-mist)] py-24 sm:py-28">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 20% 20%, rgba(61,107,95,0.22), transparent), radial-gradient(ellipse 70% 50% at 90% 80%, rgba(12,31,28,0.12), transparent)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-6 text-center">
        <p className="font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-5xl lg:text-6xl">
          Ready to run your salon on {SYNCOPS.name}?
        </p>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-[var(--m-muted)]">
          {SUBSCRIPTION.trialDays} days free. Then {SUBSCRIPTION.currencyLabel}{" "}
          {SUBSCRIPTION.monthlyAmountPkr.toLocaleString("en-PK")}/month. Your store gets booking,
          POS, staff, and reports from day one.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex h-12 items-center bg-[var(--m-ink)] px-8 text-sm font-semibold tracking-wide text-[var(--m-paper)] transition-colors hover:bg-[var(--m-ink-soft)]"
          >
            Start 1 month free
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 items-center border border-[var(--m-ink)] px-8 text-sm font-medium tracking-wide text-[var(--m-ink)] transition-colors hover:bg-[var(--m-ink)] hover:text-[var(--m-paper)]"
          >
            Staff login
          </Link>
        </div>
      </div>
    </section>
  );
}
