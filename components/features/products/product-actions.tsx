"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { adjustInventory, deleteProduct, deleteProductCategory } from "@/lib/actions/products";
import { useActionToast } from "@/hooks/use-action-toast";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/types/commerce";

const deleteBtnClass =
  "gap-1.5 border-destructive/25 bg-destructive/5 text-destructive shadow-sm transition-all hover:border-destructive/50 hover:bg-destructive hover:text-destructive-foreground hover:shadow-md";

export function DeleteProductButton({ id, name }: { id: string; name?: string }) {
  return (
    <ConfirmAction
      title="Delete product?"
      description={
        name
          ? `Delete “${name}”? Stock history for this product will remain in reports.`
          : "This product will be permanently deleted."
      }
      confirmLabel="Delete"
      pendingLabel="Deleting…"
      variant="outline"
      className={deleteBtnClass}
      onConfirm={async () => deleteProduct(id)}
      successMessage="Product deleted."
    >
      <Trash2 className="size-3.5" />
      Delete
    </ConfirmAction>
  );
}

export function DeleteProductCategoryButton({ id, name }: { id: string; name?: string }) {
  return (
    <ConfirmAction
      title="Delete category?"
      description={
        name
          ? `Delete “${name}”? Products in this category may need reassignment.`
          : "This category will be permanently deleted."
      }
      confirmLabel="Delete"
      pendingLabel="Deleting…"
      variant="outline"
      className={deleteBtnClass}
      onConfirm={async () => deleteProductCategory(id)}
      successMessage="Category deleted."
    >
      <Trash2 className="size-3.5" />
      Delete
    </ConfirmAction>
  );
}

export function InventoryAdjustForm({ products }: { products: { id: string; name: string; stock_quantity: number }[] }) {
  const [state, formAction, pending] = useActionState(adjustInventory, {} as ActionResult);
  useActionToast(state, { successMessage: "Inventory updated." });
  if (products.length === 0) return null;

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="space-y-2">
        <Label htmlFor="product_id">Product</Label>
        <select id="product_id" name="product_id" required className="flex h-8 min-w-[180px] rounded-lg border border-input bg-background px-2.5 text-sm">
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name} (stock: {p.stock_quantity})</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <select id="type" name="type" className="flex h-8 rounded-lg border border-input bg-background px-2.5 text-sm">
          <option value="IN">Stock in (add)</option>
          <option value="OUT">Stock out (remove)</option>
          <option value="ADJUSTMENT">Set on-hand quantity</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="qty">Quantity</Label>
        <Input
          id="qty"
          name="quantity"
          type="number"
          min={0}
          step="0.001"
          required
          defaultValue={1}
          className="w-28"
        />
        <p className="text-[11px] text-muted-foreground">
          “Set on-hand” replaces stock with this number (not add). Use 0 to clear stock.
        </p>
      </div>
      <div className="space-y-2 min-w-[160px] flex-1">
        <Label htmlFor="inv_notes">Notes</Label>
        <Input id="inv_notes" name="notes" placeholder="Optional" />
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Record"}</Button>
    </form>
  );
}
