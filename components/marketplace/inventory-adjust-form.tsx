"use client";

import { useTransition } from "react";
import { adjustSellerStock } from "@/lib/marketplace/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notify } from "@/lib/toast";

export function InventoryAdjustForm({
  productId,
  stock,
}: {
  productId: string;
  stock: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("product_id", productId);
        startTransition(async () => {
          const res = await adjustSellerStock(fd);
          if (res.error) notify.error(res.error);
          else notify.success("Stock updated");
        });
      }}
    >
      <Input
        name="stock"
        type="number"
        min={0}
        defaultValue={stock}
        className="w-24"
        aria-label="Stock"
      />
      <Button type="submit" size="sm" disabled={pending}>
        Save
      </Button>
    </form>
  );
}
