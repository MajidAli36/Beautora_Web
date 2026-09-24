"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useMarketplaceCart } from "@/lib/marketplace/use-cart";
import { formatMarketplaceMoney } from "@/lib/marketplace/pricing";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function MarketplaceCartPageClient() {
  const router = useRouter();
  const { items, grouped, subtotal, setQty, hydrated } = useMarketplaceCart();

  if (!hydrated) {
    return <p className="text-sm text-[var(--m-muted)]">Loading cart…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-[var(--m-muted)]">Your cart is empty.</p>
        <Button className="mt-6" render={<Link href="/shop" />}>
          Browse shop
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {grouped.map((group) => (
        <section key={group.sellerId} className="border-t border-[var(--m-line)] pt-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--m-muted)]">
            {group.sellerName || "Seller"}
          </h2>
          <ul className="mt-4 space-y-4">
            {group.items.map((i) => (
              <li
                key={`${i.productId}:${i.variantId ?? ""}`}
                className="flex flex-wrap items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/product/${i.productId}`}
                    className="font-medium text-[var(--m-ink)] underline-offset-4 hover:underline"
                  >
                    {i.title}
                  </Link>
                  <p className="mt-1 text-sm text-[var(--m-muted)]">
                    {formatMarketplaceMoney(i.price, i.currency)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setQty(i, i.quantity - 1)}
                  >
                    −
                  </Button>
                  <span className="min-w-6 text-center text-sm">{i.quantity}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setQty(i, i.quantity + 1)}
                  >
                    +
                  </Button>
                  <button
                    type="button"
                    className="ml-2 text-[var(--m-muted)] hover:text-[var(--m-ink)]"
                    onClick={() => setQty(i, 0)}
                    aria-label="Remove"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm font-medium text-[var(--m-ink)]">
            Seller subtotal{" "}
            {formatMarketplaceMoney(group.subtotal, group.items[0]?.currency)}
          </p>
        </section>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--m-line)] pt-6">
        <p className="text-lg font-semibold text-[var(--m-ink)]">
          Total {formatMarketplaceMoney(subtotal, items[0]?.currency)}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href="/shop" />}>
            Continue shopping
          </Button>
          <Button onClick={() => router.push("/checkout")}>Checkout · COD</Button>
        </div>
      </div>
    </div>
  );
}
