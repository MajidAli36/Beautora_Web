"use client";

import { useActionState } from "react";
import { upsertSellerProduct } from "@/lib/marketplace/actions";
import { useActionToast } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/types/commerce";
import type { Database } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketplaceCategoryPicker } from "@/components/marketplace/category-picker";

type Category = Database["public"]["Tables"]["marketplace_categories"]["Row"];

export function SellerProductForm({ categories }: { categories: Category[] }) {
  const [state, formAction, pending] = useActionState(upsertSellerProduct, {} as ActionResult);
  useActionToast(state, { successMessage: "Product saved." });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add product</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input id="price" name="price" type="number" min={0} step="0.01" required defaultValue={0} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock">Stock</Label>
            <Input id="stock" name="stock" type="number" min={0} step={1} required defaultValue={1} />
          </div>
          <MarketplaceCategoryPicker categories={categories} />
          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL (optional)</Label>
            <Input id="image_url" name="image_url" placeholder="https://…" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" name="submit_for_review" value="0" disabled={pending}>
              Save draft
            </Button>
            <Button
              type="submit"
              name="submit_for_review"
              value="1"
              variant="secondary"
              disabled={pending}
            >
              Submit for approval
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
