"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, ShoppingBag, Star, X } from "lucide-react";
import {
  placeMarketplaceCodOrder,
  submitMarketplaceReview,
  type PublicProductCard,
} from "@/lib/marketplace/actions";
import {
  MARKETPLACE_CART_KEY,
  cartSubtotal,
  type MarketplaceCartItem,
} from "@/lib/marketplace/cart";
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

type Category = Database["public"]["Tables"]["marketplace_categories"]["Row"];

function formatMoney(n: number) {
  return `Rs ${n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function MarketplaceShop({
  initialProducts,
  categories,
  isLoggedIn = false,
}: {
  initialProducts: PublicProductCard[];
  categories: Category[];
  isLoggedIn?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<MarketplaceCartItem[]>([]);
  const [detail, setDetail] = useState<PublicProductCard | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MARKETPLACE_CART_KEY);
      if (raw) setCart(JSON.parse(raw) as MarketplaceCartItem[]);
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
    return initialProducts.filter((p) => {
      if (category && p.category_id) {
        const cat = categories.find((c) => c.id === p.category_id);
        if (cat?.slug !== category) return false;
      } else if (category) {
        return false;
      }
      if (!qq) return true;
      return (
        p.title.toLowerCase().includes(qq) ||
        (p.description ?? "").toLowerCase().includes(qq) ||
        p.seller_name.toLowerCase().includes(qq)
      );
    });
  }, [initialProducts, q, category, categories]);

  const count = cart.reduce((s, i) => s + i.quantity, 0);
  const subtotal = cartSubtotal(cart);

  function requireShopperLogin(action: string) {
    notify.error(`Sign in to ${action}`);
    router.push(`/login?redirect=${encodeURIComponent("/shop")}`);
  }

  function addToCart(p: PublicProductCard, qty = 1) {
    if (!isLoggedIn) {
      requireShopperLogin("add items to your cart");
      return;
    }
    const existing = cart.find((i) => i.productId === p.id);
    const nextQty = (existing?.quantity ?? 0) + qty;
    if (nextQty > p.stock) {
      notify.error("Not enough stock");
      return;
    }
    const item: MarketplaceCartItem = {
      productId: p.id,
      title: p.title,
      price: Number(p.price),
      quantity: nextQty,
      imageUrl: p.image_url,
      sellerId: p.seller_id,
      sellerName: p.seller_name,
      stock: p.stock,
    };
    const next = existing
      ? cart.map((i) => (i.productId === p.id ? item : i))
      : [...cart, item];
    persist(next);
    notify.success("Added to cart");
  }

  function setQty(productId: string, quantity: number) {
    if (!isLoggedIn) {
      requireShopperLogin("update your cart");
      return;
    }
    if (quantity < 1) {
      persist(cart.filter((i) => i.productId !== productId));
      return;
    }
    persist(
      cart.map((i) =>
        i.productId === productId
          ? { ...i, quantity: Math.min(quantity, i.stock) }
          : i
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
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
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
            className="h-11 gap-2"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag className="size-4" />
            Cart{count > 0 ? ` (${count})` : ""}
          </Button>
        </div>
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3 sm:px-6">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold",
              !category
                ? "border-[var(--m-ink)] bg-[var(--m-ink)] text-[var(--m-paper)]"
                : "border-[var(--m-line)] text-[var(--m-ink-soft)]"
            )}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.slug)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold",
                category === c.slug
                  ? "border-[var(--m-ink)] bg-[var(--m-ink)] text-[var(--m-paper)]"
                  : "border-[var(--m-line)] text-[var(--m-ink-soft)]"
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 py-6 sm:grid-cols-3 sm:gap-4 sm:px-6 lg:grid-cols-4">
        {filtered.length === 0 ? (
          <p className="col-span-full py-16 text-center text-sm text-[var(--m-muted)]">
            No products match. Sellers publish after platform approval.
          </p>
        ) : (
          filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setDetail(p)}
              className="group flex flex-col overflow-hidden border border-[var(--m-line)] bg-[var(--m-paper)] text-left transition-shadow hover:shadow-md"
            >
              <div className="aspect-square bg-[var(--m-mist)]">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image_url}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-xs text-[var(--m-muted)]">
                    No image
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3">
                <p className="line-clamp-2 text-sm font-semibold text-[var(--m-ink)]">
                  {p.title}
                </p>
                <p className="text-[11px] text-[var(--m-muted)]">{p.seller_name}</p>
                <p className="mt-auto text-sm font-semibold text-[var(--m-ink)]">
                  {formatMoney(Number(p.price))}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      <Sheet open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl">
          {detail ? (
            <>
              <div className="aspect-[4/3] bg-[var(--m-mist)]">
                {detail.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={detail.image_url} alt="" className="size-full object-cover" />
                ) : null}
              </div>
              <SheetHeader className="border-b px-5 py-4">
                <SheetTitle className="text-xl">{detail.title}</SheetTitle>
                <SheetDescription>
                  {detail.seller_name}
                  {detail.category_name ? ` · ${detail.category_name}` : ""}
                  {detail.avg_rating != null
                    ? ` · ${detail.avg_rating.toFixed(1)}★ (${detail.review_count})`
                    : ""}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-5 py-4">
                <p className="text-2xl font-semibold">{formatMoney(Number(detail.price))}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {detail.description || "No description."}
                </p>
                <p className="text-xs text-muted-foreground">In stock: {detail.stock}</p>
                <Button
                  className="w-full"
                  onClick={() => {
                    addToCart(detail);
                    setCartOpen(true);
                  }}
                >
                  Add to cart
                </Button>
                <ReviewForm productId={detail.id} />
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle>Your cart</SheetTitle>
            <SheetDescription>
              Cash on delivery · Beautora Marketplace — separate from salon POS
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground">Cart is empty.</p>
            ) : (
              cart.map((i) => (
                <div key={i.productId} className="flex gap-3 border-b border-border pb-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{i.title}</p>
                    <p className="text-xs text-muted-foreground">{formatMoney(i.price)}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setQty(i.productId, i.quantity - 1)}
                      >
                        −
                      </Button>
                      <span className="text-sm">{i.quantity}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setQty(i.productId, i.quantity + 1)}
                      >
                        +
                      </Button>
                      <button
                        type="button"
                        className="ml-auto text-muted-foreground hover:text-foreground"
                        onClick={() => setQty(i.productId, 0)}
                        aria-label="Remove"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <SheetFooter className="border-t bg-muted/30 p-4 sm:flex-col sm:space-y-2">
            <div className="flex w-full items-center justify-between text-sm font-semibold">
              <span>Subtotal</span>
              <span>{formatMoney(subtotal)}</span>
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
              Pay when your order is delivered. Total {formatMoney(subtotal)}.
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
  );
}

function ReviewForm({ productId }: { productId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="space-y-3 rounded-xl border border-border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("product_id", productId);
        startTransition(async () => {
          const res = await submitMarketplaceReview(fd);
          if (res.error) notify.error(res.error);
          else {
            notify.success("Review submitted");
            e.currentTarget.reset();
          }
        });
      }}
    >
      <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Star className="size-3.5" /> Leave a review
      </p>
      <Input name="reviewer_name" placeholder="Your name" required />
      <select
        name="rating"
        defaultValue="5"
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
      >
        {[5, 4, 3, 2, 1].map((n) => (
          <option key={n} value={n}>
            {n} stars
          </option>
        ))}
      </select>
      <Textarea name="comment" rows={2} placeholder="Optional comment" />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        Submit review
      </Button>
    </form>
  );
}
