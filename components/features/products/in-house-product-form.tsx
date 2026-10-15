"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct } from "@/lib/actions/products";
import { useActionToast } from "@/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/types/commerce";
import type { ProductCategory } from "@/types";
import {
  clientsLeft,
  clientsPerPack,
  stockFromPacks,
  unitCostFromPackCost,
  unitCostFromTotalPaid,
} from "@/lib/products/in-house-math";
import { formatCurrency } from "@/lib/format";

const MEASURE_PRESETS = ["ml", "g", "spray", "pump", "drop"] as const;
const USE_PRESETS = [5, 10, 15, 20] as const;

type TrackMode = "bottles" | "open" | "pieces";
type PayMode = "all" | "each";

/**
 * Flexible in-house setup:
 * - Bottles: 50 bottles × 100 ml each, paid Rs 5000, use 5 or 10 ml/client
 * - Open: only remaining ml + what you paid
 * - Pieces: razors etc. counted 1:1
 */
export function InHouseProductForm({ categories }: { categories: ProductCategory[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createProduct, {} as ActionResult);
  useActionToast(state, {
    successMessage: "In-house product added.",
    onSuccess: () => {
      window.setTimeout(() => router.refresh(), 200);
    },
  });

  const [trackMode, setTrackMode] = useState<TrackMode>("bottles");
  const [measureMode, setMeasureMode] = useState<string>("ml");
  const [customMeasure, setCustomMeasure] = useState("");
  const [bottleCount, setBottleCount] = useState("50");
  const [eachContains, setEachContains] = useState("100");
  const [openQty, setOpenQty] = useState("500");
  const [pieceCount, setPieceCount] = useState("20");
  const [payMode, setPayMode] = useState<PayMode>("all");
  const [paidAll, setPaidAll] = useState("5000");
  const [paidEach, setPaidEach] = useState("100");
  const [useMode, setUseMode] = useState<string>("10");
  const [useCustom, setUseCustom] = useState("");
  const [lowStock, setLowStock] = useState("20");
  const [lowStockTouched, setLowStockTouched] = useState(false);

  const measure =
    trackMode === "pieces"
      ? "piece"
      : measureMode === "custom"
        ? customMeasure.trim()
        : measureMode;

  const useQty =
    useMode === "custom" ? Number(useCustom) || 0 : Number(useMode) || 0;

  useEffect(() => {
    if (lowStockTouched) return;
    if (!(useQty > 0)) return;
    setLowStock(String(Math.max(useQty * 2, 1)));
  }, [useQty, lowStockTouched]);

  const count = Number(bottleCount) || 0;
  const perItem = Number(eachContains) || 0;
  const open = Number(openQty) || 0;
  const pieces = Number(pieceCount) || 0;

  const initialStock =
    trackMode === "bottles"
      ? stockFromPacks(perItem, count)
      : trackMode === "open"
        ? Math.max(0, open)
        : Math.max(0, pieces);

  const paid =
    trackMode === "pieces"
      ? Number(paidEach) || 0
      : trackMode === "open"
        ? Number(paidAll) || 0
        : payMode === "all"
          ? Number(paidAll) || 0
          : Number(paidEach) || 0;

  const unitCost =
    trackMode === "bottles" && payMode === "each" && perItem > 0
      ? unitCostFromPackCost(paid, perItem)
      : trackMode === "pieces"
        ? paid
        : unitCostFromTotalPaid(paid, initialStock);

  const stockValue = unitCost * initialStock;
  const perBottle = trackMode === "bottles" ? clientsPerPack(perItem, useQty) : null;
  const totalClients = clientsLeft(initialStock, useQty);

  const costMode =
    trackMode === "bottles" && payMode === "each"
      ? "pack"
      : trackMode === "pieces"
        ? "unit"
        : "total";

  const packSizeHidden =
    trackMode === "bottles" && perItem > 0 ? String(perItem) : "";

  const costHidden =
    trackMode === "bottles" && payMode === "each"
      ? String(paid)
      : trackMode === "pieces"
        ? String(paid)
        : String(paid);

  const canSubmit =
    Boolean(measure) &&
    useQty > 0 &&
    initialStock >= 0 &&
    (trackMode !== "bottles" || perItem > 0);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="product_kind" value="IN_HOUSE" />
      <input type="hidden" name="unit_label" value={measure} />
      <input type="hidden" name="pack_size" value={packSizeHidden} />
      <input type="hidden" name="default_usage_qty" value={useQty > 0 ? String(useQty) : ""} />
      <input type="hidden" name="stock_quantity" value={String(initialStock)} />
      <input type="hidden" name="cost_price" value={costHidden} />
      <input type="hidden" name="cost_mode" value={costMode} />
      <input type="hidden" name="retail_price" value="0" />
      <input type="hidden" name="is_active" value="on" />

      <div className="space-y-2 sm:col-span-2 rounded-lg border border-teal-200/70 bg-teal-50/60 p-3 text-sm dark:border-teal-900/40 dark:bg-teal-950/20">
        <p className="font-medium text-foreground">Example (bottles)</p>
        <p className="text-muted-foreground">
          Buy <strong className="text-foreground">50</strong> bottles · each bottle{" "}
          <strong className="text-foreground">100 ml</strong> · paid{" "}
          <strong className="text-foreground">Rs 5,000</strong> for all · use{" "}
          <strong className="text-foreground">10 ml</strong> (or 5 ml) per client → stock{" "}
          <strong className="text-foreground">5,000 ml</strong>, ~10 clients per bottle, stock value
          Rs 5,000.
        </p>
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="ih_name">Product name *</Label>
        <Input id="ih_name" name="name" required placeholder="e.g. Faiza Beauty Cream" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ih_sku">SKU</Label>
        <Input id="ih_sku" name="sku" placeholder="Optional" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ih_category">Category</Label>
        <select
          id="ih_category"
          name="category_id"
          className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          <option value="none">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label>How do you buy / track this? *</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={trackMode === "bottles" ? "default" : "outline"}
            onClick={() => setTrackMode("bottles")}
          >
            Bottles / tubes
          </Button>
          <Button
            type="button"
            size="sm"
            variant={trackMode === "open" ? "default" : "outline"}
            onClick={() => setTrackMode("open")}
          >
            Open stock (ml left)
          </Button>
          <Button
            type="button"
            size="sm"
            variant={trackMode === "pieces" ? "default" : "outline"}
            onClick={() => setTrackMode("pieces")}
          >
            Pieces (razor etc.)
          </Button>
        </div>
      </div>

      {trackMode !== "pieces" ? (
        <div className="space-y-2">
          <Label htmlFor="ih_measure">Measure stock in *</Label>
          <select
            id="ih_measure"
            value={measureMode}
            onChange={(e) => setMeasureMode(e.target.value)}
            className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            {MEASURE_PRESETS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
            <option value="custom">Custom…</option>
          </select>
          {measureMode === "custom" ? (
            <Input
              value={customMeasure}
              onChange={(e) => setCustomMeasure(e.target.value)}
              placeholder="Your unit"
              maxLength={24}
              required
            />
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Measure</Label>
          <p className="flex h-8 items-center text-sm text-muted-foreground">piece</p>
        </div>
      )}

      {trackMode === "bottles" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="ih_count">How many bottles / tubes on hand *</Label>
            <Input
              id="ih_count"
              type="number"
              min={0}
              step="1"
              value={bottleCount}
              onChange={(e) => setBottleCount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">e.g. 50 bottles you bought.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ih_each">1 bottle / tube contains *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="ih_each"
                type="number"
                min={0.001}
                step="0.001"
                value={eachContains}
                onChange={(e) => setEachContains(e.target.value)}
                className="flex-1"
              />
              <span className="shrink-0 text-sm text-muted-foreground">{measure || "ml"}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Size of one bottle — e.g. 100 ml. Not the use-per-client amount.
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>What did you pay? *</Label>
            <div className="mb-2 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={payMode === "all" ? "default" : "outline"}
                onClick={() => setPayMode("all")}
              >
                Paid for all bottles
              </Button>
              <Button
                type="button"
                size="sm"
                variant={payMode === "each" ? "default" : "outline"}
                onClick={() => setPayMode("each")}
              >
                Paid per bottle
              </Button>
            </div>
            {payMode === "all" ? (
              <>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={paidAll}
                  onChange={(e) => setPaidAll(e.target.value)}
                  placeholder="e.g. 5000"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Total bill for these {count || 0} bottles (e.g. Rs 5,000).
                </p>
              </>
            ) : (
              <>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={paidEach}
                  onChange={(e) => setPaidEach(e.target.value)}
                  placeholder="e.g. 100"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Price of one bottle only.
                </p>
              </>
            )}
          </div>
        </>
      ) : null}

      {trackMode === "open" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="ih_open">Quantity left on hand *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="ih_open"
                type="number"
                min={0}
                step="0.001"
                value={openQty}
                onChange={(e) => setOpenQty(e.target.value)}
                className="flex-1"
              />
              <span className="shrink-0 text-sm text-muted-foreground">{measure || "ml"}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Already open — no bottle count. Just remaining {measure || "ml"}.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ih_paid_open">What you paid for this stock (Rs) *</Label>
            <Input
              id="ih_paid_open"
              type="number"
              min={0}
              step="0.01"
              value={paidAll}
              onChange={(e) => setPaidAll(e.target.value)}
            />
          </div>
        </>
      ) : null}

      {trackMode === "pieces" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="ih_pieces">Pieces on hand *</Label>
            <Input
              id="ih_pieces"
              type="number"
              min={0}
              step="1"
              value={pieceCount}
              onChange={(e) => setPieceCount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ih_paid_piece">Cost per piece (Rs) *</Label>
            <Input
              id="ih_paid_piece"
              type="number"
              min={0}
              step="0.01"
              value={paidEach}
              onChange={(e) => setPaidEach(e.target.value)}
            />
          </div>
        </>
      ) : null}

      <div className="space-y-2 sm:col-span-2">
        <Label>Use per client *</Label>
        <div className="flex flex-wrap gap-2">
          {USE_PRESETS.map((n) => (
            <Button
              key={n}
              type="button"
              size="sm"
              variant={useMode === String(n) ? "default" : "outline"}
              onClick={() => setUseMode(String(n))}
            >
              {n} {measure || "ml"}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant={useMode === "custom" ? "default" : "outline"}
            onClick={() => setUseMode("custom")}
          >
            Other…
          </Button>
        </div>
        {useMode === "custom" ? (
          <div className="mt-2 flex max-w-xs items-center gap-2">
            <Input
              type="number"
              min={0.001}
              step="0.001"
              value={useCustom}
              onChange={(e) => setUseCustom(e.target.value)}
              placeholder="e.g. 7.5"
              className="flex-1"
            />
            <span className="shrink-0 text-sm text-muted-foreground">{measure || "ml"}</span>
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">
          How much one person / one service uses. Change later only in Edit. Linking to a service
          locks this value.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ih_low">Low stock alert ({measure || "units"})</Label>
        <Input
          id="ih_low"
          name="low_stock_threshold"
          type="number"
          min={0}
          step="0.001"
          value={lowStock}
          onChange={(e) => {
            setLowStockTouched(true);
            setLowStock(e.target.value);
          }}
        />
      </div>

      <div className="sm:col-span-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm space-y-1">
        {trackMode === "bottles" && perItem > 0 ? (
          <p>
            Math: <strong>{count}</strong> × <strong>{perItem} {measure}</strong> ={" "}
            <strong>
              {initialStock} {measure}
            </strong>{" "}
            total stock
          </p>
        ) : (
          <p>
            Starting stock:{" "}
            <strong>
              {initialStock} {measure || "units"}
            </strong>
          </p>
        )}
        <p>
          Cost per {measure || "unit"}: <strong>{formatCurrency(unitCost)}</strong>
          {" · "}
          Stock value: <strong>{formatCurrency(stockValue)}</strong>
        </p>
        {perBottle != null && perBottle > 0 ? (
          <p>
            ~<strong>{perBottle}</strong> clients from <strong>1 bottle</strong> ({perItem}{" "}
            {measure} ÷ {useQty} {measure})
            {totalClients != null ? (
              <>
                {" · "}~<strong>{totalClients}</strong> clients from all stock
              </>
            ) : null}
          </p>
        ) : totalClients != null && totalClients > 0 ? (
          <p>
            ~<strong>{totalClients}</strong> clients left at {useQty} {measure}/client
          </p>
        ) : null}
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="ih_desc">Notes</Label>
        <Textarea id="ih_desc" name="description" rows={2} placeholder="Optional" />
      </div>

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending || !canSubmit}>
          {pending ? "Adding…" : "Add in-house product"}
        </Button>
      </div>
    </form>
  );
}
