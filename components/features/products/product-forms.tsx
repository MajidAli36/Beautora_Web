"use client";

import { useActionState } from "react";
import { createProduct, createProductCategory } from "@/lib/actions/products";
import { useActionToast } from "@/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/types/commerce";
import type { ProductCategory } from "@/types";

export function ProductCategoryForm() {
  const [state, formAction, pending] = useActionState(createProductCategory, {} as ActionResult);
  useActionToast(state, { successMessage: "Category added." });
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="space-y-2">
        <Label htmlFor="pc_name">Category name</Label>
        <Input id="pc_name" name="name" required />
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add category"}</Button>
    </form>
  );
}

export function ProductForm({ categories }: { categories: ProductCategory[] }) {
  const [state, formAction, pending] = useActionState(createProduct, {} as ActionResult);
  useActionToast(state, { successMessage: "Product added." });
  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="p_name">Product name *</Label>
        <Input id="p_name" name="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sku">SKU</Label>
        <Input id="sku" name="sku" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="p_category">Category</Label>
        <select
          id="p_category"
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
        <Label htmlFor="product_kind">Product kind *</Label>
        <select
          id="product_kind"
          name="product_kind"
          defaultValue="RETAIL"
          className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          <option value="RETAIL">Retail — sold to customers at POS</option>
          <option value="IN_HOUSE">In-house — used during services only</option>
          <option value="BOTH">Both — sold at POS and used in services</option>
        </select>
        <p className="text-xs text-muted-foreground">
          In-house products are hidden from POS and linked from Services as usage recipes.
        </p>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="p_desc">Description</Label>
        <Textarea id="p_desc" name="description" rows={2} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cost">Cost price (what you pay)</Label>
        <Input id="cost" name="cost_price" type="number" min={0} step="0.01" defaultValue={0} />
        <p className="text-xs text-muted-foreground">
          Used for inventory value &amp; profit — not shown to customers.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="retail">Retail price (POS selling price)</Label>
        <Input id="retail" name="retail_price" type="number" min={0} step="1" defaultValue={0} />
        <p className="text-xs text-muted-foreground">
          Required for retail / both. Can be 0 for pure in-house items.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="stock">Initial stock</Label>
        <Input
          id="stock"
          name="stock_quantity"
          type="number"
          min={0}
          step="0.001"
          defaultValue={0}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="threshold">Low stock alert</Label>
        <Input
          id="threshold"
          name="low_stock_threshold"
          type="number"
          min={0}
          defaultValue={5}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id="p_active"
          name="is_active"
          type="checkbox"
          defaultChecked
          className="size-4 rounded border"
        />
        <Label htmlFor="p_active">Active</Label>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add product"}
        </Button>
      </div>
    </form>
  );
}
