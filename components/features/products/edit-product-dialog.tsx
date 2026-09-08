"use client";

import { useActionState, useMemo, useState } from "react";
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

type EditableProduct = Product & {
  category: { id: string; name: string } | null;
};

export function EditProductButton({
  product,
  categories,
}: {
  product: EditableProduct;
  categories: ProductCategory[];
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit product</DialogTitle>
            <DialogDescription>
              Update catalog details and pricing. Use Inventory to change stock quantity.
            </DialogDescription>
          </DialogHeader>
          {open ? (
            <EditProductForm
              key={`${product.id}-${product.updated_at}`}
              product={product}
              categories={categories}
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
  onDone,
}: {
  product: EditableProduct;
  categories: ProductCategory[];
  onDone: () => void;
}) {
  const action = useMemo(
    () => updateProduct.bind(null, product.id),
    [product.id]
  );
  const [state, formAction, pending] = useActionState(action, {} as ActionResult);
  useActionToast(state, {
    successMessage: "Product updated.",
    onSuccess: onDone,
  });

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
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
        <Input
          id={`edit_p_sku_${product.id}`}
          name="sku"
          defaultValue={product.sku ?? ""}
        />
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
        <Label htmlFor={`edit_p_kind_${product.id}`}>Product kind *</Label>
        <select
          id={`edit_p_kind_${product.id}`}
          name="product_kind"
          defaultValue={product.product_kind ?? "RETAIL"}
          className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          <option value="RETAIL">Retail — sold to customers at POS</option>
          <option value="IN_HOUSE">In-house — used during services only</option>
          <option value="BOTH">Both — sold at POS and used in services</option>
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
        Current stock: <strong>{product.stock_quantity}</strong> — change stock from the
        Inventory tab.
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
