import Link from "next/link";

const STEPS = [
  {
    step: "01",
    title: "Open your store",
    body: "Create your Beautora account, name the salon, and invite owners or managers.",
  },
  {
    step: "02",
    title: "Set the floor",
    body: "Add services, products, chairs, and staff. Turn on online booking when you are ready.",
  },
  {
    step: "03",
    title: "Run every day",
    body: "Walk-ins, appointments, POS, queue, attendance, WhatsApp, and reports — all in one place.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-24 bg-[var(--m-paper)] py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
            How it works
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-5xl">
            From signup to a live salon floor
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-[var(--m-muted)]">
            Beautora is built for Pakistan salons — simple to start, serious enough for daily ops.
          </p>
        </div>

        <ol className="mt-14 grid gap-10 sm:grid-cols-3">
          {STEPS.map((item) => (
            <li key={item.step} className="border-t border-[var(--m-line)] pt-6">
              <p className="font-display text-3xl font-semibold text-[var(--m-accent)]">
                {item.step}
              </p>
              <h3 className="mt-4 font-display text-2xl font-medium text-[var(--m-ink)]">
                {item.title}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-[var(--m-muted)]">{item.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12">
          <Link
            href="/signup"
            className="inline-flex h-12 items-center bg-[var(--m-ink)] px-7 text-sm font-semibold tracking-wide text-[var(--m-paper)] transition-colors hover:bg-[var(--m-ink-soft)]"
          >
            Create your store
          </Link>
        </div>
      </div>
    </section>
  );
}
