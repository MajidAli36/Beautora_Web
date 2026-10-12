"use client";

import dynamic from "next/dynamic";

const RevenueChart = dynamic(
  () =>
    import("@/components/dashboard/revenue-chart").then((m) => ({
      default: m.RevenueChart,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 animate-pulse rounded-xl border border-border bg-muted/40" aria-hidden />
    ),
  }
);

type Props = {
  revenueByDay: { date: string; revenue: number }[];
  appointmentsByDay: { date: string; count: number }[];
};

/** Client boundary so Recharts loads after first paint. */
export function RevenueChartLazy(props: Props) {
  return <RevenueChart {...props} />;
}
