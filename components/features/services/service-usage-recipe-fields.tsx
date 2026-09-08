"use client";

import { useState } from "react";
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
};

export type UsageRecipeRow = {
  productId: string;
  quantity: number;
};

export function ServiceUsageRecipeFields({
  consumables,
  initialRows = [],
  idPrefix = "usage",
}: {
  consumables: ConsumableProductOption[];
  initialRows?: UsageRecipeRow[];
  idPrefix?: string;
}) {
  const [rows, setRows] = useState<UsageRecipeRow[]>(
    initialRows.length
      ? initialRows
      : []
  );

  return (
    <div className="space-y-3 sm:col-span-2">
      <div>
        <Label>In-house products used</Label>
        <p className="text-xs text-muted-foreground">
          Products deducted from inventory each time this service is sold at POS.
          Create in-house products under Products first.
        </p>
      </div>

      {consumables.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
          No in-house products yet. Add a product with kind &quot;In-house&quot; or
          &quot;Retail + In-house&quot; on the Products page.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => {
            const product = consumables.find((c) => c.id === row.productId);
            return (
              <div
                key={`${idPrefix}-${index}`}
                className="flex flex-wrap items-end gap-2 rounded-lg border p-2"
              >
                <div className="min-w-[12rem] flex-1 space-y-1">
                  <Label htmlFor={`${idPrefix}_product_${index}`}>Product</Label>
                  <select
                    id={`${idPrefix}_product_${index}`}
                    name="usage_product_id"
                    value={row.productId}
                    onChange={(e) => {
                      const next = [...rows];
                      next[index] = { ...next[index], productId: e.target.value };
                      setRows(next);
                    }}
                    className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                    required
                  >
                    <option value="">Select product…</option>
                    {consumables.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.sku ? ` (${c.sku})` : ""} · stock {c.stock_quantity}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-28 space-y-1">
                  <Label htmlFor={`${idPrefix}_qty_${index}`}>Qty / service</Label>
                  <Input
                    id={`${idPrefix}_qty_${index}`}
                    name="usage_qty"
                    type="number"
                    min={0.001}
                    step="0.001"
                    required
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
                <div className="pb-1 text-xs text-muted-foreground">
                  {product
                    ? `Cost ~ ${formatCurrency(product.cost_price * (Number(row.quantity) || 0))}`
                    : null}
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
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() =>
              setRows([...rows, { productId: consumables[0]?.id ?? "", quantity: 1 }])
            }
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
