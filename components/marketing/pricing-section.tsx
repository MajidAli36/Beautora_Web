import Link from "next/link";
import {
  ASIA_PLAN,
  formatPlanAmount,
  STANDARD_PLAN,
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
  highlightPlan = STANDARD_PLAN,
  detectedCountry = null,
}: PricingSectionProps) {
  const primary = highlightPlan;
  const secondary = primary.amount === ASIA_PLAN.amount ? STANDARD_PLAN : ASIA_PLAN;

  return (
    <section id="pricing" className="m-section scroll-mt-28 bg-[var(--m-ink)] text-white">
      <div className="m-container">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
            Pricing
          </p>
          <h2 className="mt-2 font-display text-[clamp(1.75rem,3.5vw,2.75rem)] font-semibold tracking-tight">
            {SUBSCRIPTION.trialDays} days free.
            <span className="block">Then a clear monthly plan.</span>
          </h2>
          <p className="mt-3 text-base leading-relaxed text-white/70">
            Every new store gets the full Beautora platform for {SUBSCRIPTION.trialDays} days.
            After the trial, Asia stores renew at ${SUBSCRIPTION.asiaAmountUsd}; all other
            countries renew at ${SUBSCRIPTION.usdtAmountUsd} — both via USDT on BNB Smart Chain.
          </p>
          {detectedCountry ? (
            <p className="mt-2 text-sm text-white/50">
              Showing payment details for your region ({detectedCountry} · USDT).
            </p>
          ) : null}
        </div>

        <div className="mt-8 grid gap-5 sm:mt-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border border-white/15 bg-white/[0.03] p-5 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--m-accent-soft)]">
              {primary.title}
            </p>
            <p className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              {formatPlanAmount(primary)}
            </p>
            <p className="mt-1.5 text-base text-white/60">per store / month</p>
            <p className="mt-4 text-sm text-white/75">
              {SUBSCRIPTION.trialDays} days free · No card required to start
            </p>
            {primary.networkLabel ? (
              <p className="mt-2 text-xs text-white/55">{primary.networkLabel}</p>
            ) : null}
            <p className="mt-3 break-all text-sm text-white/80">
              Wallet:{" "}
              <span className="font-semibold text-white">{primary.destinationDisplay}</span>
            </p>
            <Link href="/signup" className="m-btn m-btn-light mt-5 w-full sm:w-auto">
              Start {SUBSCRIPTION.trialDays} days free
            </Link>
            <p className="mt-4 text-xs leading-relaxed text-white/45">{primary.instructions}</p>
          </div>

          <div className="border border-white/15 p-5 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--m-accent-soft)]">
              Included
            </p>
            <ul className="mt-4 space-y-2.5 text-sm text-white/80">
              {INCLUDED.map((item) => (
                <li key={item} className="flex gap-2.5 border-b border-white/10 pb-2.5 last:border-0">
                  <span className="text-[var(--m-accent-soft)]" aria-hidden>
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 border-t border-white/10 pt-4">
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
                Wallet: {secondary.destinationDisplay}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
