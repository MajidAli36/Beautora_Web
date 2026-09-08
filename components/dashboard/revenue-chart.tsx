"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type RevenueChartProps = {
  revenueByDay: { date: string; revenue: number }[];
  appointmentsByDay: { date: string; count: number }[];
};

type Range = 7 | 30 | 90;

const TEAL = "#0F9D8C";

export function RevenueChart({ revenueByDay, appointmentsByDay }: RevenueChartProps) {
  const [range, setRange] = useState<Range>(30);

  const chartData = useMemo(() => {
    const slice = revenueByDay.slice(-range);
    const apptMap = new Map(appointmentsByDay.map((a) => [a.date, a.count]));
    return slice.map((d) => ({
      date: d.date.slice(5),
      revenue: d.revenue,
      appointments: apptMap.get(d.date) ?? 0,
    }));
  }, [revenueByDay, appointmentsByDay, range]);

  const hasData = chartData.some((d) => d.revenue > 0 || d.appointments > 0);

  return (
    <div className="dashboard-card w-full min-w-0 p-4 sm:p-5">
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Revenue Overview</h3>
          <p className="text-xs text-muted-foreground">Revenue and appointment activity</p>
        </div>

        <label className="sr-only" htmlFor="revenue-range">
          Chart range
        </label>
        <select
          id="revenue-range"
          value={range}
          onChange={(e) => setRange(Number(e.target.value) as Range)}
          className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm sm:hidden"
        >
          <option value={7}>7 Days</option>
          <option value={30}>30 Days</option>
          <option value={90}>90 Days</option>
        </select>

        <div className="hidden rounded-lg border border-border bg-muted/40 p-0.5 sm:flex">
          {([7, 30, 90] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "min-h-9 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150",
                range === r
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r} Days
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 sm:h-[260px]">
          <p className="px-4 text-center text-sm text-muted-foreground">
            No revenue data for this period yet.
          </p>
        </div>
      ) : (
        <div className="h-[220px] w-full min-w-0 sm:h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={TEAL} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAEAEA" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#6B7280" }}
                axisLine={false}
                tickLine={false}
                label={{ value: "Date", position: "insideBottom", offset: -2, fontSize: 10, fill: "#9CA3AF" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6B7280" }}
                axisLine={false}
                tickLine={false}
                width={44}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                label={{
                  value: "Revenue",
                  angle: -90,
                  position: "insideLeft",
                  offset: 8,
                  fontSize: 10,
                  fill: "#9CA3AF",
                }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #EAEAEA",
                  fontSize: 12,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                }}
                formatter={(value, name) => [
                  name === "revenue" ? formatCurrency(Number(value)) : value,
                  name === "revenue" ? "Revenue" : "Appointments",
                ]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={TEAL}
                strokeWidth={2.25}
                fill="url(#revenueFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
