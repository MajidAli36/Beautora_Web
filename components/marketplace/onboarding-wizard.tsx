"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerMarketplaceSeller } from "@/lib/marketplace/actions";
import { setOrganizationMarketplaceStore } from "@/lib/marketplace/buyer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

const STEPS = ["Welcome", "Shop profile", "Publish", "Done"] as const;

export function MarketplaceOnboardingWizard({
  hasSeller,
  hasOrg,
}: {
  hasSeller: boolean;
  hasOrg: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(hasSeller ? 2 : 0);
  const [pending, startTransition] = useTransition();

  function register(form: HTMLFormElement) {
    const fd = new FormData(form);
    startTransition(async () => {
      const res = await registerMarketplaceSeller({}, fd);
      if (res.error) {
        notify.error(res.error);
        return;
      }
      notify.success("Seller profile created");
      setStep(2);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex gap-2">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              i <= step ? "bg-primary" : "bg-muted"
            )}
            title={label}
          />
        ))}
      </div>

      {step === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Welcome to Beautora Marketplace</CardTitle>
            <CardDescription>
              Sell products with cash on delivery — separate from salon POS stock and finances.
              Listing is free; commission is configured by platform (launch default 0%).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={() => setStep(1)}>
              Get started
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Create your shop</CardTitle>
            <CardDescription>You can edit details later in Shop settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                register(e.currentTarget);
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="shop_name">Shop name</Label>
                <Input id="shop_name" name="shop_name" required minLength={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Short bio</Label>
                <Textarea id="bio" name="bio" rows={3} />
              </div>
              <Button type="submit" disabled={pending}>
                {pending ? "Creating…" : "Create shop"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Go live checklist</CardTitle>
            <CardDescription>
              Add products, submit for review, then share your public shop link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Add at least one product (draft → submit for review).</li>
              <li>Wait for platform approval of your seller account and products.</li>
              <li>Share your storefront and fulfill COD orders.</li>
            </ol>
            {hasOrg ? (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const res = await setOrganizationMarketplaceStore(true);
                    if (res.error) notify.error(res.error);
                    else notify.success("Salon marketplace storefront enabled");
                  });
                }}
              >
                Enable products on my salon page
              </Button>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button render={<Link href="/marketplace/products" />}>Add products</Button>
              <Button variant="outline" type="button" onClick={() => setStep(3)}>
                Finish
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>You&apos;re set</CardTitle>
            <CardDescription>
              Use the marketplace sidebar for products, orders, and payouts.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button render={<Link href="/marketplace" />}>Open dashboard</Button>
            <Button variant="outline" render={<Link href="/shop" target="_blank" />}>
              View public shop
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
