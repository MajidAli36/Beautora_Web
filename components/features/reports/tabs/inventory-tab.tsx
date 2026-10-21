"use client";

import { useMemo, useState } from "react";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { downloadCsv } from "@/lib/reports/export-csv";
import type { InventoryReport } from "@/lib/actions/reports";
import { KpiCard } from "@/components/features/reports/ui/kpi-card";
import { ReportSection } from "@/components/features/reports/ui/report-section";
import { ReportBarChart } from "@/components/features/reports/ui/report-charts";
import { ReportEmpty } from "@/components/features/reports/ui/report-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginatedList } from "@/components/ui/table-pagination";

export function InventoryTab({ data }: { data: InventoryReport }) {
  const [q, setQ] = useState("");
  const [txQ, setTxQ] = useState("");
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
  const filteredTransactions = useMemo(() => {
    const term = txQ.trim().toLowerCase();
    if (!term) return data.transactions;
    return data.transactions.filter(
      (t) =>
        t.productName.toLowerCase().includes(term) ||
        t.type.toLowerCase().includes(term) ||
        (t.referenceType ?? "").toLowerCase().includes(term) ||
        String(t.quantity).includes(term)
    );
  }, [data.transactions, txQ]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Value at cost" value={formatCurrency(k.valueAtCost.current)} hint="Current on-hand" />
        <KpiCard label="Value at retail" value={formatCurrency(k.valueAtRetail.current)} hint="Current on-hand" />
        <KpiCard label="Potential profit" value={formatCurrency(k.potentialProfit.current)} hint="Current on-hand" />
        <KpiCard label="Units sold" value={String(k.unitsSold.current)} compare={k.unitsSold} />
        <KpiCard label="Low stock" value={String(k.lowStock.current)} invertTrend hint="Current" />
        <KpiCard label="Out of stock" value={String(k.outOfStock.current)} invertTrend hint="Current" />
        <KpiCard label="Product COGS" value={formatCurrency(k.productCogs.current)} compare={k.productCogs} />
        <KpiCard label="Product gross profit" value={formatCurrency(k.productGrossProfit.current)} compare={k.productGrossProfit} />
      </div>

      <ReportSection title="Stock movement (period)" defaultOpen>
        <ReportBarChart
          data={data.movements.map((m) => ({ label: m.name, value: m.value }))}
          emptyMessage="No inventory transactions in this period."
          valueLabel="Units"
        />
      </ReportSection>

      <ReportSection
        title="Inventory overview"
        defaultOpen
        actions={
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              downloadCsv(
                `inventory-${data.from}-${data.to}.csv`,
                ["Product", "SKU", "Stock", "Status", "Cost value", "Retail value"],
                filtered.map((p) => [p.name, p.sku ?? "", p.stock, p.status, p.valueAtCost, p.valueAtRetail])
              )
            }
          >
            Export CSV
          </Button>
        }
      >
        <Input
          placeholder="Search product, SKU, status…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="mb-3 max-w-sm print:hidden"
        />
        <PaginatedList
          items={filtered}
          empty={<ReportEmpty message="No products found." />}
        >
          {(slice) => (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Cost value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slice.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.sku ?? "—"}</TableCell>
                      <TableCell className="text-right">{p.stock}</TableCell>
                      <TableCell>
                        <Badge
                          variant={p.status === "ok" ? "secondary" : "destructive"}
                          className={
                            p.status === "low"
                              ? "bg-amber-100 text-amber-900 hover:bg-amber-100"
                              : undefined
                          }
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(p.valueAtCost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </PaginatedList>
      </ReportSection>

      <ReportSection title="Inventory transactions" defaultOpen>
        <Input
          placeholder="Search product, type, reference…"
          value={txQ}
          onChange={(e) => setTxQ(e.target.value)}
          className="mb-3 max-w-sm print:hidden"
        />
        <PaginatedList
          items={filteredTransactions}
          empty={<ReportEmpty message="No inventory transactions in this period." />}
        >
          {(slice) => (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Ref</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slice.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatDateTime(t.createdAt)}
                      </TableCell>
                      <TableCell>{t.productName}</TableCell>
                      <TableCell>{t.type}</TableCell>
                      <TableCell className="text-right">{t.quantity}</TableCell>
                      <TableCell>{t.referenceType ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </PaginatedList>
      </ReportSection>

      <ReportSection title="Notes">
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          {data.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </ReportSection>
    </div>
  );
}
