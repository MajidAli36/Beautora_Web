import Link from "next/link";

const MODULES = [
  {
    group: "Front of house",
    items: [
      {
        title: "Online booking",
        body: "Clients choose service, stylist, and slot. Optional JazzCash advance with screenshot proof.",
      },
      {
        title: "Appointments & queue",
        body: "Scheduled visits plus walk-in tokens so the floor stays ordered on busy days.",
      },
      {
        title: "POS & sales",
        body: "Checkout services and retail, take payments, and keep every sale tied to the right staff.",
      },
    ],
  },
  {
    group: "Floor & team",
    items: [
      {
        title: "Services, products, chairs",
        body: "Your catalog and stations in one place — priced, timed, and ready for booking or POS.",
      },
      {
        title: "Staff & attendance",
        body: "Profiles, rosters, and fingerprint kiosk check-in so you know who is on the floor.",
      },
      {
        title: "Customers",
        body: "Profiles, history, statements, and feedback — not a spreadsheet of phone numbers.",
      },
    ],
  },
  {
    group: "Growth & control",
    items: [
      {
        title: "WhatsApp & feedback",
        body: "Follow up after visits and collect ratings without leaving Beautora.",
      },
      {
        title: "Reports & finances",
        body: "Sales, deposits, and money movement visibility for owners and managers.",
      },
      {
        title: "Billing & settings",
        body: "Store subscription, roles, and day-to-day configuration under one roof.",
      },
    ],
  },
];

export function PlatformFeatures() {
  return (
    <section id="platform" className="scroll-mt-24 bg-[var(--m-mist)] py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
            Platform
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-5xl">
            The whole salon idea — in one login
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-[var(--m-muted)]">
            Beautora covers the full store: guests arrive, chairs fill, payments clear, and
            owners see what happened — without juggling apps.
          </p>
        </div>

        <div className="mt-16 space-y-16">
          {MODULES.map((module) => (
            <div key={module.group}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--m-accent)]">
                {module.group}
              </h3>
              <ul className="mt-6 grid gap-10 sm:grid-cols-3">
                {module.items.map((item) => (
                  <li key={item.title} className="border-t border-[var(--m-line)] pt-5">
                    <h4 className="font-display text-2xl font-medium text-[var(--m-ink)]">
                      {item.title}
                    </h4>
                    <p className="mt-3 text-base leading-relaxed text-[var(--m-muted)]">
                      {item.body}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="inline-flex h-12 items-center bg-[var(--m-ink)] px-7 text-sm font-semibold tracking-wide text-[var(--m-paper)] transition-colors hover:bg-[var(--m-ink-soft)]"
          >
            Start free — open a store
          </Link>
          <Link
            href="/#pricing"
            className="inline-flex h-12 items-center border border-[var(--m-ink)] px-7 text-sm font-medium tracking-wide text-[var(--m-ink)] transition-colors hover:bg-[var(--m-ink)] hover:text-[var(--m-paper)]"
          >
            View pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
