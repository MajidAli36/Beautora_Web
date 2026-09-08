import { SUBSCRIPTION } from "@/lib/billing/subscription";

type TrustBarProps = {
  storeCount: number;
};

/** Show 100+ until real listed stores exceed 100, then show the live count. */
function salonCountDisplay(storeCount: number) {
  if (storeCount > 100) {
    return {
      value: String(storeCount),
      label: `live salon${storeCount === 1 ? "" : "s"}`,
    };
  }
  return {
    value: "100+",
    label: "salons",
  };
}

export function TrustBar({ storeCount }: TrustBarProps) {
  const items = [
    salonCountDisplay(storeCount),
    {
      value: "1",
      label: "login per store",
    },
    {
      value: String(SUBSCRIPTION.trialDays),
      label: "days free to start",
    },
    {
      value: `${SUBSCRIPTION.currencyLabel} ${SUBSCRIPTION.monthlyAmountPkr.toLocaleString("en-PK")}`,
      label: "per store / month after",
    },
  ];

  return (
    <section
      aria-label="Trust highlights"
      className="border-b border-[var(--m-line)] bg-[var(--m-paper)]"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-[var(--m-line)] sm:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="bg-[var(--m-paper)] px-5 py-7 text-center sm:py-8"
          >
            <p className="font-display text-2xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-3xl">
              {item.value}
            </p>
            <p className="mt-1.5 text-xs font-medium uppercase tracking-[0.16em] text-[var(--m-muted)]">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
