import Link from "next/link";
import {
  formatPlanAmount,
  INTERNATIONAL_PLAN,
  PAKISTAN_PLAN,
  SUBSCRIPTION,
  type BillingPlan,
} from "@/lib/billing/subscription";

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

type PricingSectionProps = {
  /** Plan highlighted for this visitor (geo). Both plans always listed. */
  highlightPlan?: BillingPlan;
  detectedCountry?: string | null;
};

export function PricingSection({
  highlightPlan = INTERNATIONAL_PLAN,
  detectedCountry = null,
}: PricingSectionProps) {
  const primary = highlightPlan;
  const secondary =
    primary.method === "jazzcash" ? INTERNATIONAL_PLAN : PAKISTAN_PLAN;

  return (
    <section id="pricing" className="scroll-mt-28 bg-[var(--m-ink)] py-28 text-white sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent-soft)]">
            Pricing
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {SUBSCRIPTION.trialDays} days free.
            <span className="block">Then a clear monthly plan.</span>
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-white/70">
            Every new store gets the full Beautora platform for {SUBSCRIPTION.trialDays} days.
            After the trial, Pakistan stores renew with JazzCash; all other countries renew with
            USDT on BNB Smart Chain.
          </p>
          {detectedCountry ? (
            <p className="mt-3 text-sm text-white/50">
              Showing payment details for your region ({detectedCountry}
              {primary.method === "jazzcash" ? " · JazzCash" : " · USDT"}).
            </p>
          ) : null}
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border border-white/15 bg-white/[0.03] p-8 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--m-accent-soft)]">
              {primary.title}
            </p>
            <p className="mt-4 font-display text-5xl font-semibold tracking-tight sm:text-6xl">
              {formatPlanAmount(primary)}
            </p>
            <p className="mt-2 text-lg text-white/60">per store / month</p>
            <p className="mt-6 text-sm text-white/75">
              {SUBSCRIPTION.trialDays} days free · No card required to start
            </p>
            {primary.networkLabel ? (
              <p className="mt-3 text-xs text-white/55">{primary.networkLabel}</p>
            ) : null}
            <p className="mt-4 break-all text-sm text-white/80">
              {primary.method === "jazzcash" ? "JazzCash" : "Wallet"}:{" "}
              <span className="font-semibold text-white">{primary.destinationDisplay}</span>
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex h-12 w-full items-center justify-center bg-white px-6 text-sm font-semibold tracking-wide text-[var(--m-ink)] transition-all duration-150 hover:bg-[var(--m-mist)] sm:w-auto"
            >
              Start {SUBSCRIPTION.trialDays} days free
            </Link>
            <p className="mt-6 text-xs leading-relaxed text-white/45">{primary.instructions}</p>
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
            <div className="mt-8 border-t border-white/10 pt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
                Other region
              </p>
              <p className="mt-3 text-sm text-white/75">
                {secondary.title}:{" "}
                <strong className="text-white">{formatPlanAmount(secondary)}/month</strong>
              </p>
              {secondary.networkLabel ? (
                <p className="mt-1 text-xs text-white/45">{secondary.networkLabel}</p>
              ) : null}
              <p className="mt-2 break-all text-xs text-white/55">
                {secondary.method === "jazzcash" ? "JazzCash" : "Wallet"}:{" "}
                {secondary.destinationDisplay}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
