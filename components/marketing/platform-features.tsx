import Link from "next/link";

const MODULES = [
  {
    group: "Front of house",
    items: [
      {
        title: "Online booking",
        body: "Clients choose service, stylist, and slot. Optional advance with payment proof when you need it.",
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
        title: "Services, products & chairs",
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
    <section id="platform" className="scroll-mt-28 bg-[var(--m-paper)] py-28 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
            The platform
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-5xl">
            The whole salon idea — in one login.
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
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                {module.items.map((item) => (
                  <li
                    key={item.title}
                    className="group border border-[var(--m-line)] bg-white p-6 transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--m-accent)]/40 motion-reduce:transform-none"
                  >
                    <h4 className="font-display text-2xl font-medium text-[var(--m-ink)] transition-colors duration-150 group-hover:text-[var(--m-accent)]">
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
            className="inline-flex h-12 items-center bg-[var(--m-ink)] px-7 text-sm font-semibold tracking-wide text-[var(--m-paper)] transition-all duration-150 hover:bg-[var(--m-ink-soft)]"
          >
            Start 30 days free
          </Link>
          <Link
            href="/#pricing"
            className="inline-flex h-12 items-center border border-[var(--m-ink)] px-7 text-sm font-medium tracking-wide text-[var(--m-ink)] transition-all duration-150 hover:bg-[var(--m-ink)] hover:text-[var(--m-paper)]"
          >
            View pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
