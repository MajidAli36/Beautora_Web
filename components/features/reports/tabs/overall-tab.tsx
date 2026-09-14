"use client";

import { useMemo, useState } from "react";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { downloadExportDocument } from "@/lib/reports/export-formats";
import { buildReportExportDocument } from "@/lib/reports/build-report-export";
import type { OverallReport } from "@/lib/actions/reports";
import { KpiCard } from "@/components/features/reports/ui/kpi-card";
import { ReportSection } from "@/components/features/reports/ui/report-section";
import {
  ReportDonutChart,
  ReportLineChart,
} from "@/components/features/reports/ui/report-charts";
import { ReportEmpty } from "@/components/features/reports/ui/report-states";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function OverallTab({ data }: { data: OverallReport }) {
  const k = data.kpis;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Total revenue" value={formatCurrency(k.totalRevenue.current)} compare={k.totalRevenue} />
        <KpiCard label="Net revenue" value={formatCurrency(k.netRevenue.current)} compare={k.netRevenue} hint="Tickets − partial refunds" />
        <KpiCard label="Sales" value={String(k.saleCount.current)} compare={k.saleCount} />
        <KpiCard label="Avg ticket" value={formatCurrency(k.aov.current)} compare={k.aov} hint="Ticket revenue / count" />
        <KpiCard label="Product gross profit" value={formatCurrency(k.productGrossProfit.current)} compare={k.productGrossProfit} />
        <KpiCard label="Service revenue" value={formatCurrency(k.serviceRevenue.current)} compare={k.serviceRevenue} hint="Line mix" />
        <KpiCard label="Product revenue" value={formatCurrency(k.productRevenue.current)} compare={k.productRevenue} hint="Line mix" />
        <KpiCard label="Package revenue" value={formatCurrency(k.packageRevenue.current)} compare={k.packageRevenue} hint="Line mix" />
        <KpiCard label="Discounts" value={formatCurrency(k.discounts.current)} compare={k.discounts} invertTrend />
        <KpiCard label="Deposit refunds" value={formatCurrency(k.depositRefunds.current)} compare={k.depositRefunds} invertTrend />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ReportSection title="Revenue trend" description="Completed ticket revenue by day" defaultOpen>
          <ReportLineChart data={data.revenueByDay} currency emptyMessage="No sales in this period." valueLabel="Revenue" />
        </ReportSection>
        <ReportSection title="Revenue mix" description="Line totals before sale-level discount" defaultOpen>
          <ReportDonutChart data={data.revenueSplit} currency emptyMessage="No line items in this period." />
        </ReportSection>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ReportSection title="Top services" defaultOpen>
          <TopTable rows={data.topServices} empty="No service sales found for the selected period." />
        </ReportSection>
        <ReportSection title="Top products" defaultOpen>
          <TopTable rows={data.topProducts} empty="No product sales found for the selected period." />
        </ReportSection>
      </div>

      <ReportSection title="Notes">
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          {data.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Generated {formatDateTime(data.generatedAt)}
        </p>
      </ReportSection>
    </div>
  );
}

function TopTable({
  rows,
  empty,
}: {
  rows: { name: string; qty: number; revenue: number }[];
  empty: string;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(term));
  }, [rows, q]);
  if (!rows.length) return <ReportEmpty message={empty} />;
  return (
    <div className="overflow-x-auto">
      <Input
        placeholder="Search name…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mb-3 max-w-sm print:hidden"
      />
      {!filtered.length ? (
        <ReportEmpty message="No items match your search." />
      ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((r) => (
            <TableRow key={r.name}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell className="text-right">{r.qty}</TableCell>
              <TableCell className="text-right">{formatCurrency(r.revenue)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      )}
    </div>
  );
}

export async function exportOverallCsv(data: OverallReport) {
  await downloadExportDocument(buildReportExportDocument("overall", data), "csv");
}
