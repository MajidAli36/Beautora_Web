import Link from "next/link";

/** Verified product facts only — no fabricated testimonials. */
export function ConfidenceSection() {
  const facts = [
    {
      title: "Free trial to start",
      body: "Full platform from day one. No card required to start.",
    },
    {
      title: "One login",
      body: "Bookings, POS, staff, customers, and reports stay connected.",
    },
    {
      title: "Clear per-store plans",
      body: "Regional USDT billing after trial — see Pricing for current rates.",
    },
    {
      title: "Built for salon operations",
      body: "Queue, chairs, attendance, and WhatsApp — not a generic CRM.",
    },
  ];

  return (
    <section className="m-section border-y border-[var(--m-line)] bg-[var(--m-card)]">
      <div className="m-container">
        <div className="max-w-2xl">
          <p className="m-eyebrow">Why salons choose Beautora</p>
          <h2 className="mt-2 font-display text-[clamp(1.75rem,3.5vw,2.75rem)] font-semibold tracking-tight text-[var(--m-ink)]">
            Serious software. Straightforward plans.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--m-muted)]">
            Everything below is how Beautora actually works — not invented social proof.
          </p>
        </div>

        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:mt-10 lg:grid-cols-4 lg:gap-5">
          {facts.map((fact) => (
            <li key={fact.title} className="border-t border-[var(--m-line)] pt-4">
              <h3 className="font-display text-lg font-medium text-[var(--m-ink)]">{fact.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--m-muted)]">{fact.body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap gap-2.5">
          <Link href="/signup" className="m-btn m-btn-primary">
            Start free
          </Link>
          <Link href="/pricing" className="m-btn m-btn-secondary">
            View pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
