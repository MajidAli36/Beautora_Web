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
      value: "3",
      label: "products in one app",
    },
    {
      value: "USDT",
      label: "regional billing",
    },
  ];

  return (
    <section
      aria-label="Trust highlights"
      className="border-b border-[var(--m-line)] bg-[var(--m-card)]"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-[var(--m-line)] sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="bg-[var(--m-card)] px-4 py-4 text-center sm:py-5">
            <p className="font-display text-xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-2xl">
              {item.value}
            </p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--m-muted)] sm:text-xs">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
