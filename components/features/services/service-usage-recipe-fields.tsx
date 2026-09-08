"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";

export type ConsumableProductOption = {
  id: string;
  name: string;
  cost_price: number;
  stock_quantity: number;
  sku: string | null;
  unit_label?: string | null;
  pack_size?: number | null;
  default_usage_qty?: number | null;
};

export type UsageRecipeRow = {
  productId: string;
  quantity: number;
};

function formatStock(n: number) {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

export function ServiceUsageRecipeFields({
  consumables,
  initialRows = [],
  idPrefix = "usage",
}: {
  consumables: ConsumableProductOption[];
  initialRows?: UsageRecipeRow[];
  idPrefix?: string;
}) {
  const [rows, setRows] = useState<UsageRecipeRow[]>(initialRows.length ? initialRows : []);

  function selectProduct(index: number, productId: string) {
    const product = consumables.find((c) => c.id === productId);
    const suggested = productId ? Number(product?.default_usage_qty) || 1 : 0;
    const next = [...rows];
    next[index] = { productId, quantity: suggested };
    setRows(next);
  }

  return (
    <div className="space-y-3 sm:col-span-2">
      <div>
        <Label>In-house products used</Label>
        <p className="text-xs text-muted-foreground">
          Part of the service — <strong className="text-foreground">not billed</strong> to the
          customer. Qty is in the product&apos;s unit (ml, piece, spray…). Example: cream 50 ml pack
          → use <strong className="text-foreground">5</strong> ml here → ~10 clients per tube.
          Stock, cost, and usage stay trackable in In-house, sales, finances, and reports. Manage
          products on{" "}
          <Link href="/in-house" className="font-medium text-primary underline-offset-2 hover:underline">
            In-house
          </Link>
          .
        </p>
      </div>

      {consumables.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
          No in-house products yet. Add cream/razor/spray under{" "}
          <Link href="/in-house" className="font-medium text-primary underline-offset-2 hover:underline">
            In-house stock
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => {
            const product = consumables.find((c) => c.id === row.productId);
            const unit = product?.unit_label?.trim() || null;
            const unitSuffix = unit ? ` ${unit}` : "";
            const qty = Number(row.quantity) || 0;
            const stock = Number(product?.stock_quantity) || 0;
            const costPerUnit = Number(product?.cost_price) || 0;
            const costPerClient = costPerUnit * qty;
            const clientsLeft =
              product && qty > 0 ? Math.floor(stock / qty + 1e-9) : null;
            const pack = Number(product?.pack_size) || 0;
            const qtyLabel = unit ? `Qty / client (${unit})` : "Qty / client";
            return (
              <div
                key={`${idPrefix}-${index}`}
                className="space-y-2 rounded-lg border p-3"
              >
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[12rem] flex-1 space-y-1">
                    <Label htmlFor={`${idPrefix}_product_${index}`}>Product</Label>
                    <select
                      id={`${idPrefix}_product_${index}`}
                      name="usage_product_id"
                      value={row.productId}
                      onChange={(e) => selectProduct(index, e.target.value)}
                      className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                      required
                    >
                      <option value="">Select product…</option>
                      {consumables.map((c) => {
                        const u = c.unit_label?.trim() || "unit";
                        return (
                          <option key={c.id} value={c.id}>
                            {c.name}
                            {c.sku ? ` (${c.sku})` : ""} · {formatStock(c.stock_quantity)} {u}
                            {c.default_usage_qty
                              ? ` · suggest ${c.default_usage_qty} ${u}`
                              : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="w-40 space-y-1">
                    <Label htmlFor={`${idPrefix}_qty_${index}`}>{qtyLabel}</Label>
                    <Input
                      id={`${idPrefix}_qty_${index}`}
                      name="usage_qty"
                      type="number"
                      min={0.001}
                      step="0.001"
                      required
                      disabled={!row.productId}
                      placeholder={unit ? `e.g. 5 ${unit}` : "Select product first"}
                      value={row.quantity || ""}
                      onChange={(e) => {
                        const next = [...rows];
                        next[index] = {
                          ...next[index],
                          quantity: Number(e.target.value) || 0,
                        };
                        setRows(next);
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setRows(rows.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="size-3.5" />
                    Remove
                  </Button>
                </div>
                {product ? (
                  <div className="grid gap-0.5 text-xs text-muted-foreground sm:grid-cols-2">
                    <p>
                      In stock:{" "}
                      <span className="font-medium text-foreground">
                        {formatStock(stock)}
                        {unitSuffix}
                      </span>
                      {pack > 0 && unit ? (
                        <span>
                          {" "}
                          · pack {formatStock(pack)}
                          {unitSuffix}
                        </span>
                      ) : null}
                    </p>
                    <p>
                      Cost:{" "}
                      <span className="font-medium text-foreground">
                        {formatCurrency(costPerUnit)}
                        {unit ? ` / ${unit}` : ""}
                      </span>
                      {qty > 0 ? (
                        <span>
                          {" "}
                          · this use{" "}
                          <span className="font-medium text-foreground">
                            {formatCurrency(costPerClient)}
                          </span>
                        </span>
                      ) : null}
                    </p>
                    {clientsLeft != null ? (
                      <p className="sm:col-span-2">
                        ~{clientsLeft.toLocaleString()} clients left at{" "}
                        <span className="font-medium text-foreground">
                          {qty}
                          {unitSuffix}
                        </span>{" "}
                        per client
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Pick a product to see its unit, stock, and cost here.
                  </p>
                )}
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => {
              const first = consumables[0];
              setRows([
                ...rows,
                {
                  productId: first?.id ?? "",
                  quantity: Number(first?.default_usage_qty) || 1,
                },
              ]);
            }}
            disabled={!consumables.length}
          >
            <Plus className="size-3.5" />
            Add product
          </Button>
        </div>
      )}
    </div>
  );
}
