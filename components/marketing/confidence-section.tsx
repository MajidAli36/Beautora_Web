import Link from "next/link";
import { SUBSCRIPTION } from "@/lib/billing/subscription";

/** Verified product facts only — no fabricated testimonials. */
export function ConfidenceSection() {
  const facts = [
    {
      title: `${SUBSCRIPTION.trialDays}-day free trial`,
      body: "Full platform from day one. No card required to start.",
    },
    {
      title: "One login",
      body: "Bookings, POS, staff, customers, and reports stay connected.",
    },
    {
      title: "Per-store pricing",
      body: `$${SUBSCRIPTION.asiaAmountUsd} Asia / $${SUBSCRIPTION.usdtAmountUsd} elsewhere per month after trial — clear and predictable.`,
    },
    {
      title: "Built for salon operations",
      body: "Queue, chairs, attendance, and WhatsApp — not a generic CRM.",
    },
  ];

  return (
    <section className="border-y border-[var(--m-line)] bg-white py-28 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
            Why salons choose Beautora
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-5xl">
            Serious software. Calm pricing.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-[var(--m-muted)]">
            Everything below is how Beautora actually works — not invented social proof.
          </p>
        </div>

        <ul className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((fact) => (
            <li key={fact.title} className="border-t border-[var(--m-line)] pt-5">
              <h3 className="font-display text-xl font-medium text-[var(--m-ink)]">
                {fact.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--m-muted)]">{fact.body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-12">
          <Link
            href="/signup"
            className="inline-flex h-12 items-center bg-[var(--m-ink)] px-7 text-sm font-semibold tracking-wide text-[var(--m-paper)] transition-all duration-150 hover:bg-[var(--m-ink-soft)]"
          >
            Start 30 days free
          </Link>
        </div>
      </div>
    </section>
  );
}
