"use client";

import { useActionState } from "react";
import { registerMarketplaceSeller } from "@/lib/marketplace/actions";
import { useActionToast } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/types/commerce";
import { BEAUTORA_PRODUCTS } from "@/lib/marketing/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SellerRegisterForm() {
  const [state, formAction, pending] = useActionState(
    registerMarketplaceSeller,
    {} as ActionResult
  );
  useActionToast(state, { successMessage: "Seller profile submitted for approval." });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seller registration</CardTitle>
        <CardDescription>
          Salons already on Beautora and new sellers can both join. After approval, your shop
          appears on the public Marketplace — never mixed with {BEAUTORA_PRODUCTS.saas.name} POS
          stock or salon reports.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shop_name">Shop name</Label>
            <Input
              id="shop_name"
              name="shop_name"
              required
              minLength={2}
              placeholder="e.g. Glow Retail Co."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">About your shop (optional)</Label>
            <Textarea
              id="bio"
              name="bio"
              rows={3}
              placeholder="What you sell, delivery areas, brand story…"
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Submitting…" : "Register for Marketplace"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
