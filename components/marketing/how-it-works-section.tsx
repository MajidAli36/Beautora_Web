import Link from "next/link";

const STEPS = [
  {
    step: "01",
    title: "Open your store",
    body: "Create your Beautora account, name your salon, and invite owners or managers.",
  },
  {
    step: "02",
    title: "Set the floor",
    body: "Add services, products, chairs, staff, schedules, and booking rules.",
  },
  {
    step: "03",
    title: "Run every day",
    body: "Manage bookings, walk-ins, POS, staff, customers, WhatsApp, and reports from one place.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-28 bg-[var(--m-mist)] py-28 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
            How it works
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-5xl">
            From signup to a live salon floor.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-[var(--m-muted)]">
            A calm path from empty store to a working floor — without a month of setup theatre.
          </p>
        </div>

        <ol className="relative mt-16 grid gap-10 sm:grid-cols-3 sm:gap-8">
          <div
            className="pointer-events-none absolute left-[16%] right-[16%] top-7 hidden h-px bg-[var(--m-line)] sm:block"
            aria-hidden
          />
          {STEPS.map((item) => (
            <li key={item.step} className="relative">
              <p className="relative z-[1] inline-flex bg-[var(--m-mist)] pr-3 font-display text-3xl font-semibold text-[var(--m-accent)]">
                {item.step}
              </p>
              <h3 className="mt-5 font-display text-2xl font-medium text-[var(--m-ink)]">
                {item.title}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-[var(--m-muted)]">{item.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-14">
          <Link
            href="/signup"
            className="inline-flex h-12 items-center bg-[var(--m-ink)] px-7 text-sm font-semibold tracking-wide text-[var(--m-paper)] transition-all duration-150 hover:bg-[var(--m-ink-soft)]"
          >
            Create your store
          </Link>
        </div>
      </div>
    </section>
  );
}
