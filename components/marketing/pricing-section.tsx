import Link from "next/link";
import { SUBSCRIPTION } from "@/lib/billing/subscription";

const INCLUDED = [
  "Online booking",
  "POS & sales",
  "Staff & attendance",
  "Queue management",
  "WhatsApp & feedback",
  "Customer management",
  "Reports & finances",
  "Billing & settings",
];

export function PricingSection() {
  const amount = SUBSCRIPTION.monthlyAmountPkr.toLocaleString("en-PK");

  return (
    <section id="pricing" className="scroll-mt-28 bg-[var(--m-ink)] py-28 text-white sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent-soft)]">
            Pricing
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            30 days free.
            <span className="block">Then {SUBSCRIPTION.currencyLabel} {amount}/month.</span>
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-white/70">
            Every new store gets the full Beautora platform for {SUBSCRIPTION.trialDays} days.
            After the trial, continue for {SUBSCRIPTION.currencyLabel} {amount}/month per store.
          </p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border border-white/15 bg-white/[0.03] p-8 sm:p-10">
            <p className="font-display text-5xl font-semibold tracking-tight sm:text-6xl">
              {SUBSCRIPTION.currencyLabel} {amount}
            </p>
            <p className="mt-2 text-lg text-white/60">per store / month</p>
            <p className="mt-6 text-sm text-white/75">
              {SUBSCRIPTION.trialDays} days free · No card required to start
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex h-12 w-full items-center justify-center bg-white px-6 text-sm font-semibold tracking-wide text-[var(--m-ink)] transition-all duration-150 hover:bg-[var(--m-mist)] sm:w-auto"
            >
              Start 30 days free
            </Link>
          </div>

          <div className="border border-white/15 p-8 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--m-accent-soft)]">
              Included
            </p>
            <ul className="mt-6 space-y-3 text-sm text-white/80">
              {INCLUDED.map((item) => (
                <li key={item} className="flex gap-3 border-b border-white/10 pb-3 last:border-0">
                  <span className="text-[var(--m-accent-soft)]" aria-hidden>
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-xs leading-relaxed text-white/45">
              After trial, renew via JazzCash ({SUBSCRIPTION.jazzcashDisplay}). Upload your
              transfer proof in Billing — SyncOps unlocks the store after review.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
