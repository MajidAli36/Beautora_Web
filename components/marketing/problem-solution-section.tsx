const BEFORE = [
  "WhatsApp",
  "Notebook",
  "Spreadsheet",
  "Separate POS",
  "Random online shop",
  "Manual reports",
];
const AFTER = ["Bookings", "Queue", "Salon POS", "Marketplace", "Staff", "Customers", "Reports"];

export function ProblemSolutionSection() {
  return (
    <section className="bg-[var(--m-paper)] py-28 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
            The shift
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-5xl">
            Your salon shouldn&apos;t run on five different tools.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-[var(--m-muted)]">
            Bookings in WhatsApp. Walk-ins on paper. Sales in a separate POS. Products on a random
            shop. Staff attendance somewhere else. Reports built manually.
          </p>
          <p className="mt-3 text-base font-medium text-[var(--m-ink-soft)]">
            Beautora brings Salon Management, POS & Marketplace together.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-0 border border-[var(--m-line)] sm:grid-cols-2">
          <div className="border-b border-[var(--m-line)] bg-[var(--m-mist)]/60 p-8 sm:border-b-0 sm:border-r">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--m-muted)]">
              Before Beautora
            </p>
            <ul className="mt-6 space-y-3">
              {BEFORE.map((item) => (
                <li
                  key={item}
                  className="border-b border-[var(--m-line)] pb-3 text-base text-[var(--m-ink-soft)] last:border-0 last:pb-0"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--m-accent)]">
              With Beautora
            </p>
            <ul className="mt-6 space-y-3">
              {AFTER.map((item) => (
                <li
                  key={item}
                  className="border-b border-[var(--m-line)] pb-3 text-base font-medium text-[var(--m-ink)] last:border-0 last:pb-0"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
