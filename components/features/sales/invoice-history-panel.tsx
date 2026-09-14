"use client";

import { useMemo, useState } from "react";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SaleStockMovement } from "@/lib/inventory/service-usage";
import Link from "next/link";

type VersionRow = {
  id: string;
  version_number: number;
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  change_reason: string | null;
  changed_at: string;
  status: string;
  items?: {
    id: string;
    name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    item_type: string;
  }[];
};

type RefundRow = {
  id: string;
  amount: number;
  method: string;
  reason: string;
  created_at: string;
};

export function InvoiceHistoryPanel({
  versions,
  refunds,
  stockMovements = [],
}: {
  versions: VersionRow[];
  refunds: RefundRow[];
  stockMovements?: SaleStockMovement[];
}) {
  const [movementQ, setMovementQ] = useState("");
  const filteredMovements = useMemo(() => {
    const term = movementQ.trim().toLowerCase();
    if (!term) return stockMovements;
    return stockMovements.filter(
      (m) =>
        m.productName.toLowerCase().includes(term) ||
        m.label.toLowerCase().includes(term) ||
        (m.kind === "in_house" ? "in-house" : "retail").includes(term) ||
        String(m.quantity).includes(term)
    );
  }, [stockMovements, movementQ]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Version history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!versions.length ? (
            <p className="text-sm text-muted-foreground">
              No amendment snapshots yet. Version 1 is created on the first amendment.
            </p>
          ) : (
            versions.map((v) => (
              <div key={v.id} className="rounded-lg border border-border/80 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">v{v.version_number}</Badge>
                    <span className="text-sm font-medium">{formatCurrency(v.total)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(v.changed_at)}
                  </span>
                </div>
                {v.change_reason ? (
                  <p className="mb-2 text-xs text-muted-foreground">{v.change_reason}</p>
                ) : null}
                {(v.items?.length ?? 0) > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {v.items!.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm">{item.name}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.line_total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Refund history</CardTitle>
          <CardDescription>
            Partial refunds are money only. Full refund restores retail stock; in-house stays
            deducted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!refunds.length ? (
            <p className="text-sm text-muted-foreground">No refunds recorded.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {refunds.map((r) => (
                <li key={r.id} className="flex justify-between gap-3 border-b border-border/60 py-2">
                  <div>
                    <p className="font-medium">
                      {formatCurrency(r.amount)} · {r.method}
                    </p>
                    <p className="text-xs text-muted-foreground">{r.reason}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(r.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stock movements</CardTitle>
          <CardDescription>
            Retail and in-house inventory tied to this invoice (deduct, amend, restore).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!stockMovements.length ? (
            <p className="text-sm text-muted-foreground">No inventory movements for this invoice.</p>
          ) : (
            <>
            <Input
              placeholder="Search product, event, type…"
              value={movementQ}
              onChange={(e) => setMovementQ(e.target.value)}
              className="mb-3 max-w-sm"
            />
            {!filteredMovements.length ? (
              <p className="text-sm text-muted-foreground">No movements match your search.</p>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(m.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={
                          m.kind === "in_house"
                            ? `/in-house/${m.productId}`
                            : `/products`
                        }
                        className="text-sm text-primary underline-offset-2 hover:underline"
                      >
                        {m.productName}
                      </Link>
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        {m.kind === "in_house" ? "In-house" : "Retail"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{m.label}</TableCell>
                    <TableCell className="text-right font-medium">
                      {m.type === "IN" ? "+" : "−"}
                      {m.quantity}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
