"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

function money(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function NoShowCalculator() {
  const [chairsLost, setChairsLost] = useState(8);
  const [avgTicket, setAvgTicket] = useState(4500);
  const [weeks, setWeeks] = useState(4);

  const monthly = useMemo(
    () => chairsLost * avgTicket * weeks,
    [chairsLost, avgTicket, weeks]
  );

  return (
    <div className="border border-[var(--m-line)] bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm">
          <span className="text-[var(--m-muted)]">No-shows / week</span>
          <input
            type="number"
            min={0}
            value={chairsLost}
            onChange={(e) => setChairsLost(Number(e.target.value) || 0)}
            className="mt-1 h-10 w-full border border-[var(--m-line)] px-3"
          />
        </label>
        <label className="text-sm">
          <span className="text-[var(--m-muted)]">Avg ticket value</span>
          <input
            type="number"
            min={0}
            value={avgTicket}
            onChange={(e) => setAvgTicket(Number(e.target.value) || 0)}
            className="mt-1 h-10 w-full border border-[var(--m-line)] px-3"
          />
        </label>
        <label className="text-sm">
          <span className="text-[var(--m-muted)]">Weeks / month</span>
          <input
            type="number"
            min={1}
            max={5}
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value) || 1)}
            className="mt-1 h-10 w-full border border-[var(--m-line)] px-3"
          />
        </label>
      </div>
      <p className="mt-6 text-sm text-[var(--m-muted)]">Estimated monthly revenue at risk</p>
      <p className="font-display text-4xl font-semibold text-[var(--m-ink)]">{money(monthly)}</p>
      <p className="mt-4 text-sm text-[var(--m-muted)]">
        Reduce no-shows with clearer{" "}
        <Link href="/salon-booking-software" className="underline-offset-4 hover:underline">
          online booking
        </Link>{" "}
        and optional advances — see our{" "}
        <Link
          href="/blog/how-to-reduce-salon-no-shows"
          className="underline-offset-4 hover:underline"
        >
          no-show guide
        </Link>
        .
      </p>
    </div>
  );
}
