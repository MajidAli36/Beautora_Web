"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

function money(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function CommissionCalculator() {
  const [revenue, setRevenue] = useState(180000);
  const [rate, setRate] = useState(40);
  const [booth, setBooth] = useState(0);

  const payout = useMemo(() => {
    const commission = (revenue * rate) / 100;
    return Math.max(0, commission - booth);
  }, [revenue, rate, booth]);

  return (
    <div className="border border-[var(--m-line)] bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm">
          <span className="text-[var(--m-muted)]">Service revenue</span>
          <input
            type="number"
            min={0}
            value={revenue}
            onChange={(e) => setRevenue(Number(e.target.value) || 0)}
            className="mt-1 h-10 w-full border border-[var(--m-line)] px-3"
          />
        </label>
        <label className="text-sm">
          <span className="text-[var(--m-muted)]">Commission %</span>
          <input
            type="number"
            min={0}
            max={100}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value) || 0)}
            className="mt-1 h-10 w-full border border-[var(--m-line)] px-3"
          />
        </label>
        <label className="text-sm">
          <span className="text-[var(--m-muted)]">Booth / deductions</span>
          <input
            type="number"
            min={0}
            value={booth}
            onChange={(e) => setBooth(Number(e.target.value) || 0)}
            className="mt-1 h-10 w-full border border-[var(--m-line)] px-3"
          />
        </label>
      </div>
      <p className="mt-6 text-sm text-[var(--m-muted)]">Estimated stylist payout</p>
      <p className="font-display text-4xl font-semibold text-[var(--m-ink)]">{money(payout)}</p>
      <p className="mt-4 text-sm text-[var(--m-muted)]">
        Beautora tracks staff on sales for reporting. Automated commission engines are still evolving —
        use this calculator for planning, then reconcile with your{" "}
        <Link href="/salon-staff-management" className="underline-offset-4 hover:underline">
          staff workflows
        </Link>
        .
      </p>
    </div>
  );
}
