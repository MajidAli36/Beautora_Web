"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { placeMarketplaceCodOrder } from "@/lib/marketplace/actions";
import { useMarketplaceCart } from "@/lib/marketplace/use-cart";
import { formatMarketplaceMoney } from "@/lib/marketplace/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

export function MarketplaceCheckoutClient({
  isLoggedIn,
  defaultName,
  defaultPhone,
  defaultEmail,
}: {
  isLoggedIn: boolean;
  defaultName?: string;
  defaultPhone?: string;
  defaultEmail?: string;
}) {
  const router = useRouter();
  const { items, grouped, subtotal, clear, hydrated } = useMarketplaceCart();
  const [pending, startTransition] = useTransition();
  const [payMethod, setPayMethod] = useState<"COD" | "CARD">("COD");

  if (!hydrated) {
    return <p className="text-sm text-[var(--m-muted)]">Loading…</p>;
  }

  if (!isLoggedIn) {
    return (
      <div className="py-10 text-center">
        <p className="text-[var(--m-muted)]">Sign in to checkout with COD or card.</p>
        <Button
          className="mt-6"
          render={<Link href={`/login?redirect=${encodeURIComponent("/checkout")}`} />}
        >
          Sign in
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-[var(--m-muted)]">Cart is empty.</p>
        <Button className="mt-6" render={<Link href="/shop" />}>
          Browse shop
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const res = await placeMarketplaceCodOrder({
              buyerName: String(fd.get("buyer_name") ?? ""),
              buyerPhone: String(fd.get("buyer_phone") ?? ""),
              buyerAddress: String(fd.get("buyer_address") ?? ""),
              buyerNotes: String(fd.get("buyer_notes") ?? ""),
              buyerEmail: String(fd.get("buyer_email") ?? ""),
              paymentMethod: payMethod,
              items: items.map((i) => ({
                productId: i.productId,
                quantity: i.quantity,
                variantId: i.variantId,
              })),
            });
            if (res.error) {
              notify.error(res.error);
              return;
            }
            clear();
            notify.success(
              payMethod === "CARD"
                ? `Order ${res.orderNumber} placed — invoice emailed. Complete card payment when prompted.`
                : `Order ${res.orderNumber} placed (COD) — invoice emailed.`
            );
            router.push(`/shop?ordered=${encodeURIComponent(res.orderNumber ?? "")}`);
          });
        }}
      >
        <div className="space-y-2">
          <Label>Payment method</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={cn(
                "rounded-lg border px-3 py-3 text-left text-sm transition",
                payMethod === "COD"
                  ? "border-[var(--m-ink)] bg-[var(--m-ink)] text-[var(--m-paper)]"
                  : "border-[var(--m-line)]"
              )}
              onClick={() => setPayMethod("COD")}
            >
              <span className="font-semibold">Cash on delivery</span>
              <span className="mt-1 block text-xs opacity-80">Pay when delivered</span>
            </button>
            <button
              type="button"
              className={cn(
                "rounded-lg border px-3 py-3 text-left text-sm transition",
                payMethod === "CARD"
                  ? "border-[var(--m-ink)] bg-[var(--m-ink)] text-[var(--m-paper)]"
                  : "border-[var(--m-line)]"
              )}
              onClick={() => setPayMethod("CARD")}
            >
              <span className="font-semibold">Credit / debit card</span>
              <span className="mt-1 block text-xs opacity-80">Pay online · invoice on success</span>
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="buyer_name">Full name</Label>
          <Input
            id="buyer_name"
            name="buyer_name"
            required
            defaultValue={defaultName}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="buyer_email">Email {payMethod === "CARD" ? "(required)" : "(for invoice)"}</Label>
          <Input
            id="buyer_email"
            name="buyer_email"
            type="email"
            required={payMethod === "CARD"}
            defaultValue={defaultEmail}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="buyer_phone">Phone</Label>
          <Input
            id="buyer_phone"
            name="buyer_phone"
            required
            defaultValue={defaultPhone}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="buyer_address">Delivery address</Label>
          <Textarea id="buyer_address" name="buyer_address" required rows={4} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="buyer_notes">Notes (optional)</Label>
          <Textarea id="buyer_notes" name="buyer_notes" rows={2} />
        </div>
        <p className="text-xs text-[var(--m-muted)]">
          Cash on delivery — pay when your order arrives. Multi-seller carts create one parent
          order with independent seller fulfillment.
        </p>
        <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
          {pending ? "Placing…" : `Confirm COD · ${formatMarketplaceMoney(subtotal, items[0]?.currency)}`}
        </Button>
      </form>

      <aside className="border border-[var(--m-line)] bg-[var(--m-mist)] p-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--m-muted)]">
          Order summary
        </h2>
        <ul className="mt-4 space-y-4">
          {grouped.map((g) => (
            <li key={g.sellerId}>
              <p className="text-sm font-medium text-[var(--m-ink)]">
                {g.sellerName || "Seller"}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-[var(--m-muted)]">
                {g.items.map((i) => (
                  <li key={`${i.productId}:${i.variantId ?? ""}`}>
                    {i.title} × {i.quantity}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm font-semibold text-[var(--m-ink)]">
                {formatMarketplaceMoney(g.subtotal, g.items[0]?.currency)}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-6 border-t border-[var(--m-line)] pt-4 text-base font-semibold text-[var(--m-ink)]">
          Total {formatMarketplaceMoney(subtotal, items[0]?.currency)}
        </p>
        <Link
          href="/cart"
          className="mt-3 inline-block text-sm text-[var(--m-accent)] underline-offset-4 hover:underline"
        >
          Edit cart
        </Link>
      </aside>
    </div>
  );
}
