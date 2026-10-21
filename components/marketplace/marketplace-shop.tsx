"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, ShoppingBag, X } from "lucide-react";
import { placeMarketplaceCodOrder, type PublicProductCard } from "@/lib/marketplace/actions";
import {
  MARKETPLACE_CART_KEY,
  cartSubtotal,
  groupCartBySeller,
  type MarketplaceCartItem,
} from "@/lib/marketplace/cart";
import { formatMarketplaceMoney } from "@/lib/marketplace/pricing";
import { MarketplaceProductCard } from "@/components/marketplace/product-card";
import { MarketplaceQuickViewProvider } from "@/components/marketplace/product-quick-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/toast";
import type { Database } from "@/types/database.types";
import {
  marketplaceCategoryChildren,
  marketplaceCategoryMatchIds,
  marketplaceCategoryParents,
} from "@/lib/marketplace/category-tree";

type Category = Database["public"]["Tables"]["marketplace_categories"]["Row"];

export function MarketplaceShop({
  initialProducts,
  categories,
  isLoggedIn = false,
  initialQuery = "",
  initialCategory = null,
}: {
  initialProducts: PublicProductCard[];
  categories: Category[];
  isLoggedIn?: boolean;
  initialQuery?: string;
  initialCategory?: string | null;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [category, setCategory] = useState<string | null>(initialCategory);
  const [cart, setCart] = useState<MarketplaceCartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const parents = useMemo(
    () => marketplaceCategoryParents(categories),
    [categories]
  );
  const activeParent = useMemo(() => {
    if (!category) return null;
    const hit = categories.find((c) => c.slug === category);
    if (!hit) return null;
    if (!hit.parent_id) return hit;
    return categories.find((c) => c.id === hit.parent_id) ?? null;
  }, [categories, category]);
  const subcategories = useMemo(
    () => (activeParent ? marketplaceCategoryChildren(categories, activeParent.id) : []),
    [categories, activeParent]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MARKETPLACE_CART_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as MarketplaceCartItem[];
      queueMicrotask(() => setCart(parsed));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: MarketplaceCartItem[]) => {
    setCart(next);
    try {
      localStorage.setItem(MARKETPLACE_CART_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const matchIds = marketplaceCategoryMatchIds(categories, category);
    return initialProducts.filter((p) => {
      if (matchIds) {
        if (!p.category_id || !matchIds.has(p.category_id)) return false;
      }
      if (!qq) return true;
      return (
        p.title.toLowerCase().includes(qq) ||
        (p.description ?? "").toLowerCase().includes(qq) ||
        (p.short_description ?? "").toLowerCase().includes(qq) ||
        p.seller_name.toLowerCase().includes(qq)
      );
    });
  }, [initialProducts, q, category, categories]);

  const count = cart.reduce((s, i) => s + i.quantity, 0);
  const subtotal = cartSubtotal(cart);
  const grouped = groupCartBySeller(cart);

  function requireShopperLogin(action: string) {
    notify.error(`Sign in to ${action}`);
    router.push(`/login?redirect=${encodeURIComponent("/shop")}`);
  }

  function cartKey(i: { productId: string; variantId?: string | null }) {
    return `${i.productId}:${i.variantId ?? ""}`;
  }

  function setQty(item: MarketplaceCartItem, quantity: number) {
    if (!isLoggedIn) {
      requireShopperLogin("update your cart");
      return;
    }
    const key = cartKey(item);
    if (quantity < 1) {
      persist(cart.filter((i) => cartKey(i) !== key));
      return;
    }
    persist(
      cart.map((i) =>
        cartKey(i) === key ? { ...i, quantity: Math.min(quantity, i.stock) } : i
      )
    );
  }

  function placeOrder(form: HTMLFormElement) {
    if (!isLoggedIn) {
      requireShopperLogin("place an order");
      return;
    }
    const fd = new FormData(form);
    startTransition(async () => {
      const res = await placeMarketplaceCodOrder({
        buyerName: String(fd.get("buyer_name") ?? ""),
        buyerPhone: String(fd.get("buyer_phone") ?? ""),
        buyerAddress: String(fd.get("buyer_address") ?? ""),
        buyerNotes: String(fd.get("buyer_notes") ?? ""),
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          variantId: i.variantId,
        })),
      });
      if (res.error) {
        notify.error(res.error);
        return;
      }
      notify.success(`Order ${res.orderNumber} placed (COD)`);
      persist([]);
      setCheckoutOpen(false);
      setCartOpen(false);
    });
  }

  return (
    <MarketplaceQuickViewProvider isLoggedIn={isLoggedIn}>
    <div className="relative min-h-[70vh]">
      <div className="sticky top-[var(--m-chrome)] z-20 border-b border-[var(--m-line)] bg-[var(--m-paper)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--m-muted)]" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products or sellers…"
              className="h-11 border-[var(--m-line)] bg-[var(--m-mist)] pl-10"
            />
          </div>
          <Button
            type="button"
            className="h-11 gap-2 border-0 bg-[var(--m-accent)] text-[var(--m-ink)] hover:bg-[#b8955a] hover:text-[var(--m-ink)] active:bg-[#a8844f]"
            onClick={() => router.push("/cart")}
          >
            <ShoppingBag className="size-4" />
            Cart{count > 0 ? ` (${count})` : ""}
          </Button>
        </div>
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 pb-3 sm:px-6">
          <div className="flex gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setCategory(null)}
              className={cn(
                "shrink-0 border px-3 py-1.5 text-xs font-semibold",
                !category
                  ? "border-[var(--m-ink)] bg-[var(--m-ink)] text-[var(--m-paper)]"
                  : "border-[var(--m-line)] text-[var(--m-ink-soft)]"
              )}
            >
              All
            </button>
            {parents.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.slug)}
                className={cn(
                  "shrink-0 border px-3 py-1.5 text-xs font-semibold",
                  category === c.slug || activeParent?.id === c.id
                    ? "border-[var(--m-ink)] bg-[var(--m-ink)] text-[var(--m-paper)]"
                    : "border-[var(--m-line)] text-[var(--m-ink-soft)]"
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
          {subcategories.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setCategory(activeParent?.slug ?? null)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium",
                  category === activeParent?.slug
                    ? "border-[var(--m-accent)] bg-[var(--m-accent)]/10 text-[var(--m-ink)]"
                    : "border-[var(--m-line)] text-[var(--m-muted)]"
                )}
              >
                All {activeParent?.name}
              </button>
              {subcategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.slug)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium",
                    category === c.slug
                      ? "border-[var(--m-accent)] bg-[var(--m-accent)]/10 text-[var(--m-ink)]"
                      : "border-[var(--m-line)] text-[var(--m-muted)]"
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 py-6 sm:grid-cols-3 sm:gap-4 sm:px-6 lg:grid-cols-4">
        {filtered.length === 0 ? (
          <p className="col-span-full py-16 text-center text-sm text-[var(--m-muted)]">
            No products match. Sellers publish after platform approval.
          </p>
        ) : (
          filtered.map((p) => <MarketplaceProductCard key={p.id} product={p} />)
        )}
      </div>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle>Your cart</SheetTitle>
            <SheetDescription>
              Cash on delivery · Beautora Marketplace — separate from salon POS
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground">Cart is empty.</p>
            ) : (
              grouped.map((group) => (
                <div key={group.sellerId} className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--m-muted)]">
                    {group.sellerName || "Seller"}
                  </p>
                  {group.items.map((i) => (
                    <div
                      key={cartKey(i)}
                      className="flex gap-3 border-b border-border pb-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{i.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatMarketplaceMoney(i.price, i.currency)}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setQty(i, i.quantity - 1)}
                          >
                            −
                          </Button>
                          <span className="text-sm">{i.quantity}</span>
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
                            className="ml-auto text-muted-foreground hover:text-foreground"
                            onClick={() => setQty(i, 0)}
                            aria-label="Remove"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
          <SheetFooter className="border-t bg-muted/30 p-4 sm:flex-col sm:space-y-2">
            <div className="flex w-full items-center justify-between text-sm font-semibold">
              <span>Subtotal</span>
              <span>{formatMarketplaceMoney(subtotal, cart[0]?.currency)}</span>
            </div>
            <Button
              className="w-full"
              disabled={cart.length === 0}
              onClick={() => {
                setCartOpen(false);
                setCheckoutOpen(true);
              }}
            >
              Checkout · COD
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle>Place COD order</SheetTitle>
            <SheetDescription>
              Pay when your order is delivered. Total{" "}
              {formatMarketplaceMoney(subtotal, cart[0]?.currency)}.
            </SheetDescription>
          </SheetHeader>
          <form
            className="space-y-4 px-5 py-5"
            onSubmit={(e) => {
              e.preventDefault();
              placeOrder(e.currentTarget);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="buyer_name">Full name</Label>
              <Input id="buyer_name" name="buyer_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buyer_phone">Phone</Label>
              <Input id="buyer_phone" name="buyer_phone" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buyer_address">Delivery address</Label>
              <Textarea id="buyer_address" name="buyer_address" required rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buyer_notes">Notes (optional)</Label>
              <Textarea id="buyer_notes" name="buyer_notes" rows={2} />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Placing…" : "Confirm COD order"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
    </MarketplaceQuickViewProvider>
  );
}
