"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { downloadCsv } from "@/lib/reports/export-csv";
import type { InHouseUsageReport } from "@/lib/actions/reports/in-house";
import { KpiCard } from "@/components/features/reports/ui/kpi-card";
import { ReportSection } from "@/components/features/reports/ui/report-section";
import { ReportEmpty } from "@/components/features/reports/ui/report-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function usageTypeLabel(type: string, referenceType: string | null) {
  const ref = String(referenceType ?? "");
  if (ref === "service_usage" || ref === "service_usage_amend") return "POS auto-deduct";
  if (
    ref === "service_usage_void" ||
    ref === "service_usage_amend_reverse" ||
    ref === "service_usage_restore"
  ) {
    return "Restored";
  }
  if (ref === "manual") return type === "IN" ? "Stock in" : "Stock out";
  return type;
}

export function InHouseUsageTab({ data }: { data: InHouseUsageReport }) {
  const [q, setQ] = useState("");
  const k = data.kpis;
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data.products;
    return data.products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.sku ?? "").toLowerCase().includes(term) ||
        p.status.includes(term)
    );
  }, [data.products, q]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Qty used (period)"
          value={String(Math.round(k.qtyUsed.current * 1000) / 1000)}
          compare={k.qtyUsed}
          hint="Net auto-deduct at POS"
        />
        <KpiCard
          label="Usage cost"
          value={formatCurrency(k.usageCost.current)}
          compare={k.usageCost}
          hint="Net used × cost/unit"
        />
        <KpiCard
          label="Stock value now"
          value={formatCurrency(k.stockValue.current)}
          hint="Remaining on hand"
        />
        <KpiCard
          label="Low / out"
          value={String(k.lowStock.current)}
          invertTrend
          hint="Needs restock"
        />
        <KpiCard
          label="Products tracked"
          value={String(k.productsTracked.current)}
          hint="In-house + shared"
        />
      </div>

      {data.notes.length ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {data.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}

      <ReportSection
        title="By product — remaining & used"
        defaultOpen
        actions={
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              downloadCsv(
                `in-house-usage-${data.from}-${data.to}.csv`,
                [
                  "Product",
                  "SKU",
                  "Unit",
                  "Remaining",
                  "Used (period)",
                  "Usage cost",
                  "Clients left",
                  "Status",
                ],
                filtered.map((p) => [
                  p.name,
                  p.sku ?? "",
                  p.unit,
                  p.stockRemaining,
                  p.netUsedInPeriod,
                  p.usageCostInPeriod,
                  p.clientsLeft ?? "",
                  p.status,
                ])
              )
            }
          >
            Export CSV
          </Button>
        }
      >
        <Input
          placeholder="Search product…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="mb-3 max-w-sm print:hidden"
        />
        {!filtered.length ? (
          <ReportEmpty message="No in-house products found." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Use / client</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="text-right">Used (period)</TableHead>
                  <TableHead className="text-right">Usage cost</TableHead>
                  <TableHead className="text-right">Clients left</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/in-house/${p.id}`}
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        {p.name}
                      </Link>
                      {p.sku ? (
                        <div className="text-xs text-muted-foreground">{p.sku}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {p.usePerClient != null ? `${p.usePerClient} ${p.unit}` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.stockRemaining} {p.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.netUsedInPeriod} {p.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(p.usageCostInPeriod)}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.clientsLeft != null ? `~${p.clientsLeft}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.status === "ok" ? "secondary" : p.status === "low" ? "outline" : "destructive"
                        }
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ReportSection>

      <ReportSection title="Usage movements (period)" defaultOpen>
        {!data.transactions.length ? (
          <ReportEmpty message="No in-house usage in this period." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(t.createdAt)}
                    </TableCell>
                    <TableCell>{t.productName}</TableCell>
                    <TableCell>{usageTypeLabel(t.type, t.referenceType)}</TableCell>
                    <TableCell className="text-right">
                      {t.type === "OUT" ? "-" : "+"}
                      {t.quantity} {t.unit}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(t.valueAtCost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ReportSection>
    </div>
  );
}
