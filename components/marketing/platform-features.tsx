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
        title: "Marketplace",
        body: "List products and take COD orders online — separate from salon POS stock and money.",
      },
    ],
  },
];

export function PlatformFeatures() {
  return (
    <section id="platform" className="m-section scroll-mt-28 bg-[var(--m-paper)]">
      <div className="m-container">
        <div className="max-w-2xl">
          <p className="m-eyebrow">The platform</p>
          <h2 className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] font-semibold tracking-tight text-[var(--m-ink)]">
            Salon management, POS & marketplace — one workspace.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-[var(--m-muted)]">
            Guests arrive, chairs fill, payments clear, products sell online, and owners see what
            happened — without juggling apps.
          </p>
        </div>

        <div className="mt-8 space-y-8 sm:mt-10 sm:space-y-10">
          {MODULES.map((module) => (
            <div key={module.group}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--m-ink-soft)]">
                {module.group}
              </h3>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
                {module.items.map((item) => (
                  <li
                    key={item.title}
                    className="group border border-[var(--m-line)] bg-[var(--m-card)] p-6 transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--m-ink)]/25 motion-reduce:transform-none"
                  >
                    <h4 className="font-display text-xl font-medium text-[var(--m-ink)] sm:text-2xl">
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
