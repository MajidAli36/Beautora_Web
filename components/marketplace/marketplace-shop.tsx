"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { placeMarketplaceCodOrder, type PublicProductCard } from "@/lib/marketplace/actions";
import {
  MARKETPLACE_CART_KEY,
  cartSubtotal,
  groupCartBySeller,
  type MarketplaceCartItem,
} from "@/lib/marketplace/cart";
import {
  effectiveProductPrice,
  formatMarketplaceMoney,
  publicDiscountPercentage,
} from "@/lib/marketplace/pricing";
import { MarketplaceProductCard } from "@/components/marketplace/product-card";
import { MarketplaceQuickViewProvider } from "@/components/marketplace/product-quick-view";
import {
  SHOP_SORT_OPTIONS,
  ShopFilters,
  type ShopFilterState,
  type ShopSort,
} from "@/components/marketplace/shop-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PaginatedList } from "@/components/ui/table-pagination";
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
  marketplaceCategoryMatchIds,
  marketplaceCategoryParents,
} from "@/lib/marketplace/category-tree";

type Category = Database["public"]["Tables"]["marketplace_categories"]["Row"];

function defaultFilters(bounds: { min: number; max: number }): ShopFilterState {
  return {
    categorySlugs: [],
    countries: [],
    minPrice: bounds.min,
    maxPrice: bounds.max,
    minRating: null,
  };
}

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
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sort, setSort] = useState<ShopSort>("newest");
  const [cart, setCart] = useState<MarketplaceCartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const parents = useMemo(
    () => marketplaceCategoryParents(categories),
    [categories]
  );

  const priceBounds = useMemo(() => {
    if (initialProducts.length === 0) {
      return { min: 0, max: 1000, currency: "PKR" };
    }
    const prices = initialProducts.map((p) => effectiveProductPrice(p));
    const min = Math.floor(Math.min(...prices));
    const max = Math.ceil(Math.max(...prices));
    // Prefer the most common currency among listings for the slider label.
    const counts = new Map<string, number>();
    for (const p of initialProducts) {
      counts.set(p.currency, (counts.get(p.currency) ?? 0) + 1);
    }
    const currency =
      [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "PKR";
    return { min, max: Math.max(min + 1, max), currency };
  }, [initialProducts]);

  const [filters, setFilters] = useState<ShopFilterState>(() => {
    const base = defaultFilters(priceBounds);
    if (initialCategory) {
      return { ...base, categorySlugs: [initialCategory] };
    }
    return base;
  });

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

  const categoryOptions = useMemo(() => {
    return parents.map((c) => {
      const matchIds = marketplaceCategoryMatchIds(categories, c.slug);
      const count = initialProducts.filter(
        (p) => p.category_id && matchIds?.has(p.category_id)
      ).length;
      return { id: c.id, slug: c.slug, name: c.name, count };
    });
  }, [parents, categories, initialProducts]);

  const countryOptions = useMemo(() => {
    const map = new Map<string, { count: number; currency: string }>();
    for (const p of initialProducts) {
      const name = (p.seller_country ?? "").trim() || "Unknown";
      const cur = map.get(name) ?? { count: 0, currency: p.currency };
      cur.count += 1;
      map.set(name, cur);
    }
    return [...map.entries()]
      .map(([name, v]) => ({ name, count: v.count, currency: v.currency }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [initialProducts]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    let rows = initialProducts.filter((p) => {
      if (filters.categorySlugs.length > 0) {
        const ok = filters.categorySlugs.some((slug) => {
          const ids = marketplaceCategoryMatchIds(categories, slug);
          return Boolean(p.category_id && ids?.has(p.category_id));
        });
        if (!ok) return false;
      }
      if (filters.countries.length > 0) {
        const country = (p.seller_country ?? "").trim() || "Unknown";
        if (!filters.countries.includes(country)) return false;
      }
      const price = effectiveProductPrice(p);
      if (price < filters.minPrice || price > filters.maxPrice) return false;
      if (filters.minRating != null) {
        if (p.avg_rating == null || p.avg_rating < filters.minRating) return false;
      }
      if (!qq) return true;
      return (
        p.title.toLowerCase().includes(qq) ||
        (p.description ?? "").toLowerCase().includes(qq) ||
        (p.short_description ?? "").toLowerCase().includes(qq) ||
        p.seller_name.toLowerCase().includes(qq) ||
        (p.seller_country ?? "").toLowerCase().includes(qq) ||
        (p.category_name ?? "").toLowerCase().includes(qq)
      );
    });

    rows = [...rows].sort((a, b) => {
      const pa = effectiveProductPrice(a);
      const pb = effectiveProductPrice(b);
      switch (sort) {
        case "price_asc":
          return pa - pb;
        case "price_desc":
          return pb - pa;
        case "rating":
          return (b.avg_rating ?? -1) - (a.avg_rating ?? -1);
        case "discount":
          return publicDiscountPercentage(b) - publicDiscountPercentage(a);
        case "newest":
        default:
          return (
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
      }
    });

    return rows;
  }, [initialProducts, q, filters, categories, sort]);

  const activeFilterCount =
    filters.categorySlugs.length +
    filters.countries.length +
    (filters.minRating != null ? 1 : 0) +
    (filters.minPrice > priceBounds.min || filters.maxPrice < priceBounds.max
      ? 1
      : 0);

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

  function clearFilters() {
    setFilters(defaultFilters(priceBounds));
  }

  const filtersProps = {
    categories: categoryOptions,
    countries: countryOptions,
    priceBounds,
    filters,
    onChange: setFilters,
    onClear: clearFilters,
  } as const;

  return (
    <MarketplaceQuickViewProvider isLoggedIn={isLoggedIn}>
      <div className="relative min-h-[70vh]">
        <div className="sticky top-[var(--m-chrome)] z-20 border-b border-[var(--m-line)] bg-[var(--m-paper)]/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                className="hidden h-10 items-center gap-2 border border-[var(--m-line)] bg-[var(--m-card)] px-3 text-xs font-semibold tracking-wide text-[var(--m-ink)] transition hover:border-[var(--m-ink)] lg:inline-flex"
              >
                {filtersOpen ? (
                  <PanelLeftClose className="size-3.5" />
                ) : (
                  <PanelLeftOpen className="size-3.5" />
                )}
                {filtersOpen ? "Hide filters" : "Show filters"}
                {activeFilterCount > 0 ? (
                  <span className="bg-[var(--m-ink)] px-1.5 py-0.5 text-[10px] text-[var(--m-paper)]">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className="inline-flex h-10 items-center gap-2 border border-[var(--m-line)] bg-[var(--m-card)] px-3 text-xs font-semibold tracking-wide text-[var(--m-ink)] lg:hidden"
              >
                <SlidersHorizontal className="size-3.5" />
                Filters
                {activeFilterCount > 0 ? (
                  <span className="bg-[var(--m-ink)] px-1.5 py-0.5 text-[10px] text-[var(--m-paper)]">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
            </div>

            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--m-muted)]" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search products, sellers, or countries…"
                className="h-10 border-[var(--m-line)] bg-[var(--m-mist)] pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="shop-sort">
                Sort by
              </label>
              <select
                id="shop-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as ShopSort)}
                className="h-10 min-w-[10.5rem] border border-[var(--m-line)] bg-[var(--m-card)] px-3 text-xs font-semibold text-[var(--m-ink)]"
              >
                {SHOP_SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    Sort: {o.label}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                className="h-10 gap-2 border-0 bg-[var(--m-accent)] text-[var(--m-ink)] hover:bg-[#b8955a] hover:text-[var(--m-ink)]"
                onClick={() => router.push("/cart")}
              >
                <ShoppingBag className="size-4" />
                Cart{count > 0 ? ` (${count})` : ""}
              </Button>
            </div>
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
          {filtersOpen ? (
            <div className="hidden w-[260px] shrink-0 lg:block">
              <div className="sticky top-[calc(var(--m-chrome)+4.25rem)] max-h-[calc(100dvh-var(--m-chrome)-5.5rem)]">
                <ShopFilters {...filtersProps} className="h-full" />
              </div>
            </div>
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-[var(--m-muted)]">
                <span className="font-semibold text-[var(--m-ink)]">
                  {filtered.length}
                </span>{" "}
                {filtered.length === 1 ? "product" : "products"}
                {filters.countries.length === 1
                  ? ` in ${filters.countries[0]}`
                  : ""}
              </p>
              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-semibold text-[var(--m-accent)] underline-offset-2 hover:underline"
                >
                  Clear filters
                </button>
              ) : null}
            </div>

            <PaginatedList
              items={filtered}
              pageSize={12}
              empty={
                <p className="border border-dashed border-[var(--m-line)] bg-[var(--m-mist)]/50 py-16 text-center text-sm text-[var(--m-muted)]">
                  No products match these filters. Try clearing price, rating, or
                  country.
                </p>
              }
            >
              {(slice) => (
                <div
                  className={cn(
                    "grid grid-cols-2 gap-3 sm:gap-4",
                    filtersOpen
                      ? "sm:grid-cols-2 xl:grid-cols-3"
                      : "sm:grid-cols-3 lg:grid-cols-4"
                  )}
                >
                  {slice.map((p) => (
                    <MarketplaceProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </PaginatedList>
          </div>
        </div>

        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="marketplace-theme z-[100] w-[min(100vw,20rem)] gap-0 overflow-hidden p-0"
            overlayClassName="z-[100] bg-[#073b32]/45"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-[var(--m-line)] px-4 py-3">
                <p className="text-sm font-semibold text-[var(--m-ink)]">Filters</p>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="inline-flex size-8 items-center justify-center text-[var(--m-ink)]"
                  aria-label="Close filters"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <ShopFilters {...filtersProps} className="h-full border-0" />
              </div>
              <div className="border-t border-[var(--m-line)] p-3">
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="inline-flex h-11 w-full items-center justify-center bg-[var(--m-ink)] text-sm font-semibold text-[var(--m-paper)]"
                >
                  Show {filtered.length} products
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <Sheet open={cartOpen} onOpenChange={setCartOpen}>
          <SheetContent
            side="right"
            className="marketplace-theme z-[100] w-full gap-0 p-0 sm:max-w-md"
            overlayClassName="z-[100] bg-[#073b32]/45"
          >
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
          <SheetContent
            side="right"
            className="marketplace-theme z-[100] w-full gap-0 overflow-y-auto p-0 sm:max-w-md"
            overlayClassName="z-[100] bg-[#073b32]/45"
          >
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
                <Textarea
                  id="buyer_address"
                  name="buyer_address"
                  required
                  rows={3}
                />
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
