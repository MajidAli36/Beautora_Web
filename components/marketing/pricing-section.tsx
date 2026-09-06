import Link from "next/link";
import { SUBSCRIPTION } from "@/lib/billing/subscription";

export function PricingSection() {
  const amount = SUBSCRIPTION.monthlyAmountPkr.toLocaleString("en-PK");

  return (
    <section id="pricing" className="scroll-mt-24 bg-[var(--m-ink)] py-24 text-white sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent-soft)]">
            Pricing
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            One month free. Then {SUBSCRIPTION.currencyLabel} {amount}/month.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-white/70">
            Every new store gets a full {SUBSCRIPTION.trialDays}-day trial. After that, renew with
            JazzCash — Beautora verifies the transfer and keeps your salon unlocked.
          </p>
        </div>

        <div className="mt-14 grid gap-10 border-t border-white/15 pt-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="font-display text-6xl font-semibold tracking-tight sm:text-7xl">
              {SUBSCRIPTION.currencyLabel} {amount}
            </p>
            <p className="mt-2 text-lg text-white/65">per store / month after trial</p>
            <ul className="mt-8 space-y-3 text-base text-white/80">
              <li className="flex gap-3 border-b border-white/10 pb-3">
                <span className="text-[var(--m-accent-soft)]">01</span>
                <span>
                  {SUBSCRIPTION.trialDays} days free — full platform, no card required to start
                </span>
              </li>
              <li className="flex gap-3 border-b border-white/10 pb-3">
                <span className="text-[var(--m-accent-soft)]">02</span>
                <span>
                  Then {SUBSCRIPTION.currencyLabel} {amount}/month via JazzCash (
                  {SUBSCRIPTION.jazzcashDisplay})
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-[var(--m-accent-soft)]">03</span>
                <span>
                  Upload invoice + transaction ID — we re-enable the store after approval
                </span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col justify-between border border-white/20 bg-white/5 p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--m-accent-soft)]">
                Included
              </p>
              <ul className="mt-5 space-y-2.5 text-sm leading-relaxed text-white/75">
                <li>Online booking storefront</li>
                <li>POS, sales, and customer history</li>
                <li>Staff, chairs, attendance devices</li>
                <li>Queue, WhatsApp, feedback</li>
                <li>Reports, finances, and billing</li>
              </ul>
            </div>
            <Link
              href="/signup"
              className="mt-10 inline-flex h-12 items-center justify-center bg-white px-6 text-sm font-semibold tracking-wide text-[var(--m-ink)] transition-colors hover:bg-[var(--m-mist)]"
            >
              Start your free month
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
