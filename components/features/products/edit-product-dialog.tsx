"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { updateProduct } from "@/lib/actions/products";
import { useActionToast } from "@/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ActionResult } from "@/types/commerce";
import type { Product, ProductCategory } from "@/types";
import {
  clientsLeft,
  clientsPerPack,
  packCostFromUnitCost,
  unitCostFromPackCost,
} from "@/lib/products/in-house-math";
import { formatCurrency } from "@/lib/format";

const MEASURE_PRESETS = ["ml", "g", "spray", "pump", "drop"] as const;
const USE_PRESETS = [5, 10, 15, 20] as const;

type TrackMode = "bottles" | "open" | "pieces";

type EditableProduct = Product & {
  category: { id: string; name: string } | null;
  unit_label?: string | null;
  pack_size?: number | null;
  default_usage_qty?: number | null;
};

function inferTrackMode(product: EditableProduct): TrackMode {
  const unit = (product.unit_label ?? "").trim().toLowerCase();
  if (unit === "piece" || unit === "pieces") return "pieces";
  if (Number(product.pack_size) > 0) return "bottles";
  return "open";
}

export function EditProductButton({
  product,
  categories,
  catalog = "retail",
}: {
  product: EditableProduct;
  categories: ProductCategory[];
  catalog?: "retail" | "inhouse";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Pencil className="size-3.5" />
        Edit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit {catalog === "inhouse" ? "in-house product" : "product"}</DialogTitle>
            <DialogDescription>
              {catalog === "inhouse"
                ? "Same setup as Add: bottles / open stock / pieces. Change quantity from Restock / adjust."
                : "Update catalog details and pricing. Use Inventory to change stock quantity."}
            </DialogDescription>
          </DialogHeader>
          {open ? (
            <EditProductForm
              key={`${product.id}-${product.updated_at}`}
              product={product}
              categories={categories}
              catalog={catalog}
              onDone={() => setOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function EditProductForm({
  product,
  categories,
  catalog,
  onDone,
}: {
  product: EditableProduct;
  categories: ProductCategory[];
  catalog: "retail" | "inhouse";
  onDone: () => void;
}) {
  const router = useRouter();
  const action = useMemo(
    () =>
      async (_prev: ActionResult, formData: FormData) =>
        updateProduct(product.id, _prev, formData),
    [product.id]
  );
  const [state, formAction, pending] = useActionState(action, {} as ActionResult);
  useActionToast(state, {
    successMessage: "Product updated.",
    onSuccess: () => {
      onDone();
      router.refresh();
    },
  });

  if (catalog === "inhouse") {
    return (
      <EditInHouseFields
        product={product}
        categories={categories}
        formAction={formAction}
        pending={pending}
        onDone={onDone}
      />
    );
  }

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="product_kind" value="RETAIL" />
      <input type="hidden" name="unit_label" value={product.unit_label ?? ""} />
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`edit_p_name_${product.id}`}>Product name *</Label>
        <Input
          id={`edit_p_name_${product.id}`}
          name="name"
          required
          defaultValue={product.name}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`edit_p_sku_${product.id}`}>SKU</Label>
        <Input id={`edit_p_sku_${product.id}`} name="sku" defaultValue={product.sku ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`edit_p_cat_${product.id}`}>Category</Label>
        <select
          id={`edit_p_cat_${product.id}`}
          name="category_id"
          defaultValue={product.category_id ?? product.category?.id ?? "none"}
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
        <Label htmlFor={`edit_p_desc_${product.id}`}>Description</Label>
        <Textarea
          id={`edit_p_desc_${product.id}`}
          name="description"
          rows={2}
          defaultValue={product.description ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`edit_p_cost_${product.id}`}>Cost price</Label>
        <Input
          id={`edit_p_cost_${product.id}`}
          name="cost_price"
          type="number"
          min={0}
          step="0.01"
          defaultValue={String(product.cost_price ?? 0)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`edit_p_retail_${product.id}`}>Retail price *</Label>
        <Input
          id={`edit_p_retail_${product.id}`}
          name="retail_price"
          type="number"
          min={0}
          step="1"
          required
          defaultValue={String(product.retail_price ?? 0)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`edit_p_low_${product.id}`}>Low stock alert</Label>
        <Input
          id={`edit_p_low_${product.id}`}
          name="low_stock_threshold"
          type="number"
          min={0}
          defaultValue={String(product.low_stock_threshold ?? 0)}
        />
      </div>
      <div className="flex items-center gap-2 self-end pb-1">
        <input
          id={`edit_p_active_${product.id}`}
          name="is_active"
          type="checkbox"
          defaultChecked={product.is_active}
          className="size-4 rounded border"
        />
        <Label htmlFor={`edit_p_active_${product.id}`}>Active</Label>
      </div>
      <p className="text-xs text-muted-foreground sm:col-span-2">
        Current stock: <strong>{product.stock_quantity}</strong> — change stock from Inventory.
      </p>
      <DialogFooter className="sm:col-span-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Mirrors InHouseProductForm fields so Add and Edit stay in sync. */
function EditInHouseFields({
  product,
  categories,
  formAction,
  pending,
  onDone,
}: {
  product: EditableProduct;
  categories: ProductCategory[];
  formAction: (payload: FormData) => void;
  pending: boolean;
  onDone: () => void;
}) {
  const initialMode = inferTrackMode(product);
  const unitStored = (product.unit_label ?? "ml").trim() || "ml";
  const packStored = Number(product.pack_size) || 0;
  const unitCostStored = Number(product.cost_price) || 0;
  const useStored = Number(product.default_usage_qty) || 0;

  const [trackMode, setTrackMode] = useState<TrackMode>(initialMode);
  const [measureMode, setMeasureMode] = useState(() => {
    if (initialMode === "pieces") return "ml";
    return (MEASURE_PRESETS as readonly string[]).includes(unitStored) ? unitStored : "custom";
  });
  const [customMeasure, setCustomMeasure] = useState(() =>
    (MEASURE_PRESETS as readonly string[]).includes(unitStored) ? "" : unitStored
  );
  const [eachContains, setEachContains] = useState(
    packStored > 0 ? String(packStored) : "100"
  );
  const [paidEach, setPaidEach] = useState(() => {
    if (packStored > 0) return String(packCostFromUnitCost(unitCostStored, packStored));
    return String(unitCostStored || 100);
  });
  const [costPerUnit, setCostPerUnit] = useState(String(unitCostStored));
  const [useMode, setUseMode] = useState(() => {
    if (USE_PRESETS.includes(useStored as (typeof USE_PRESETS)[number])) {
      return String(useStored);
    }
    return useStored > 0 ? "custom" : "5";
  });
  const [useCustom, setUseCustom] = useState(() =>
    USE_PRESETS.includes(useStored as (typeof USE_PRESETS)[number]) ? "" : String(useStored || "")
  );

  const measure =
    trackMode === "pieces"
      ? "piece"
      : measureMode === "custom"
        ? customMeasure.trim()
        : measureMode;

  const useQty =
    useMode === "custom" ? Number(useCustom) || 0 : Number(useMode) || 0;
  const perItem = Number(eachContains) || 0;
  const stock = Number(product.stock_quantity) || 0;

  const unitCost =
    trackMode === "bottles" && perItem > 0
      ? unitCostFromPackCost(Number(paidEach) || 0, perItem)
      : trackMode === "pieces"
        ? Number(paidEach) || 0
        : Number(costPerUnit) || 0;

  const stockValue = unitCost * stock;
  const perBottle = trackMode === "bottles" ? clientsPerPack(perItem, useQty) : null;
  const totalClients = clientsLeft(stock, useQty);
  const approxBottles =
    trackMode === "bottles" && perItem > 0 ? Math.floor(stock / perItem + 1e-9) : null;

  const costMode =
    trackMode === "bottles" && perItem > 0
      ? "pack"
      : trackMode === "pieces"
        ? "unit"
        : "unit";

  const costHidden =
    trackMode === "bottles" || trackMode === "pieces"
      ? String(Number(paidEach) || 0)
      : String(Number(costPerUnit) || 0);

  const packSizeHidden =
    trackMode === "bottles" && perItem > 0 ? String(perItem) : "";

  const lockedKind = product.product_kind === "BOTH" ? "BOTH" : "IN_HOUSE";
  const canSubmit = Boolean(measure) && useQty > 0 && (trackMode !== "bottles" || perItem > 0);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="product_kind" value={lockedKind} />
      <input type="hidden" name="retail_price" value={String(product.retail_price ?? 0)} />
      <input type="hidden" name="unit_label" value={measure} />
      <input type="hidden" name="pack_size" value={packSizeHidden} />
      <input type="hidden" name="default_usage_qty" value={useQty > 0 ? String(useQty) : ""} />
      <input type="hidden" name="cost_price" value={costHidden} />
      <input type="hidden" name="cost_mode" value={costMode} />

      <div className="space-y-2 sm:col-span-2 rounded-lg border border-teal-200/70 bg-teal-50/60 p-3 text-sm dark:border-teal-900/40 dark:bg-teal-950/20">
        <p className="font-medium text-foreground">Same as Add</p>
        <p className="text-muted-foreground">
          Bottles: set size in each bottle + cost of one bottle. Open stock: cost per {measure || "ml"}{" "}
          only. Stock qty stays on Restock / adjust.
        </p>
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`edit_p_name_${product.id}`}>Product name *</Label>
        <Input
          id={`edit_p_name_${product.id}`}
          name="name"
          required
          defaultValue={product.name}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`edit_p_sku_${product.id}`}>SKU</Label>
        <Input id={`edit_p_sku_${product.id}`} name="sku" defaultValue={product.sku ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`edit_p_cat_${product.id}`}>Category</Label>
        <select
          id={`edit_p_cat_${product.id}`}
          name="category_id"
          defaultValue={product.category_id ?? product.category?.id ?? "none"}
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
          <Label htmlFor={`edit_p_measure_${product.id}`}>Measure stock in *</Label>
          <select
            id={`edit_p_measure_${product.id}`}
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
            <Label htmlFor={`edit_p_each_${product.id}`}>1 bottle / tube contains *</Label>
            <div className="flex items-center gap-2">
              <Input
                id={`edit_p_each_${product.id}`}
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
          <div className="space-y-2">
            <Label htmlFor={`edit_p_paid_each_${product.id}`}>Cost of 1 bottle (Rs) *</Label>
            <Input
              id={`edit_p_paid_each_${product.id}`}
              type="number"
              min={0}
              step="0.01"
              value={paidEach}
              onChange={(e) => setPaidEach(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              What you pay for one bottle. We convert to cost per {measure || "ml"}.
            </p>
          </div>
        </>
      ) : null}

      {trackMode === "open" ? (
        <div className="space-y-2">
          <Label htmlFor={`edit_p_cost_unit_${product.id}`}>
            Cost per {measure || "ml"} (Rs) *
          </Label>
          <Input
            id={`edit_p_cost_unit_${product.id}`}
            type="number"
            min={0}
            step="0.0001"
            value={costPerUnit}
            onChange={(e) => setCostPerUnit(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Open stock has no bottle size — stock value = remaining × this cost.
          </p>
        </div>
      ) : null}

      {trackMode === "pieces" ? (
        <div className="space-y-2">
          <Label htmlFor={`edit_p_piece_cost_${product.id}`}>Cost per piece (Rs) *</Label>
          <Input
            id={`edit_p_piece_cost_${product.id}`}
            type="number"
            min={0}
            step="0.01"
            value={paidEach}
            onChange={(e) => setPaidEach(e.target.value)}
          />
        </div>
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
          How much one service uses. Link to service locks this value; change it here in Edit.
        </p>
      </div>

      <div className="sm:col-span-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm space-y-1">
        <p>
          Current stock:{" "}
          <strong>
            {stock} {measure || "units"}
          </strong>
          {approxBottles != null ? (
            <>
              {" "}
              (~{approxBottles} full bottle{approxBottles === 1 ? "" : "s"} at {perItem} {measure})
            </>
          ) : null}
        </p>
        <p>
          Cost per {measure || "unit"}: <strong>{formatCurrency(unitCost)}</strong>
          {" · "}
          Stock value: <strong>{formatCurrency(stockValue)}</strong>
        </p>
        {perBottle != null && perBottle > 0 ? (
          <p>
            ~<strong>{perBottle}</strong> clients from 1 bottle ({perItem} {measure} ÷ {useQty}{" "}
            {measure})
            {totalClients != null ? (
              <>
                {" · "}~<strong>{totalClients}</strong> clients left in stock
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
        <Label htmlFor={`edit_p_desc_${product.id}`}>Notes</Label>
        <Textarea
          id={`edit_p_desc_${product.id}`}
          name="description"
          rows={2}
          defaultValue={product.description ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`edit_p_low_${product.id}`}>Low stock alert ({measure || "units"})</Label>
        <Input
          id={`edit_p_low_${product.id}`}
          name="low_stock_threshold"
          type="number"
          min={0}
          step="0.001"
          defaultValue={String(product.low_stock_threshold ?? 0)}
        />
      </div>
      <div className="flex items-center gap-2 self-end pb-1">
        <input
          id={`edit_p_active_${product.id}`}
          name="is_active"
          type="checkbox"
          defaultChecked={product.is_active}
          className="size-4 rounded border"
        />
        <Label htmlFor={`edit_p_active_${product.id}`}>Active</Label>
      </div>
      <p className="text-xs text-muted-foreground sm:col-span-2">
        Change stock quantity from Restock / adjust (same unit).
      </p>
      <DialogFooter className="sm:col-span-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !canSubmit}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}
