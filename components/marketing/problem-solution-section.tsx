const BEFORE = [
  "WhatsApp threads for bookings",
  "Notebook for walk-ins",
  "Spreadsheet for customers",
  "Separate POS at checkout",
  "Random online shop for retail",
  "Manual end-of-day reports",
];
const AFTER = [
  "Online booking",
  "Queue & appointments",
  "Salon POS",
  "Marketplace",
  "Staff & attendance",
  "Customers & reports",
];

export function ProblemSolutionSection() {
  return (
    <section className="m-section bg-[var(--m-paper)]">
      <div className="m-container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="m-eyebrow">The shift</p>
          <h2 className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] font-semibold tracking-tight text-[var(--m-ink)]">
            Your salon shouldn&apos;t run on five different tools.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--m-muted)] sm:text-lg">
            Bookings in chat. Walk-ins on paper. Sales in a separate till. Products on another shop.
            Reports rebuilt by hand.
          </p>
          <p className="mt-2 text-sm font-medium text-[var(--m-ink-soft)] sm:text-base">
            Beautora brings salon management, POS, and marketplace together.
          </p>
        </div>

        <div className="mx-auto mt-8 grid max-w-4xl gap-0 border border-[var(--m-line)] sm:mt-10 sm:grid-cols-2">
          <div className="border-b border-[var(--m-line)] bg-[var(--m-mist)]/70 p-5 sm:border-b-0 sm:border-r sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--m-muted)]">
              Before Beautora
            </p>
            <ul className="mt-4 space-y-2.5">
              {BEFORE.map((item) => (
                <li
                  key={item}
                  className="border-b border-[var(--m-line)] pb-3 text-base text-[var(--m-body)] last:border-0 last:pb-0"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-[var(--m-card)] p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--m-ink-soft)]">
              With Beautora
            </p>
            <ul className="mt-4 space-y-2.5">
              {AFTER.map((item) => (
                <li
                  key={item}
                  className="border-b border-[var(--m-line)] pb-2.5 text-sm font-medium text-[var(--m-ink)] last:border-0 last:pb-0 sm:text-base"
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
