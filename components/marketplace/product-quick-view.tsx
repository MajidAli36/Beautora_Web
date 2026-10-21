"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  ShoppingBag,
  Star,
  X,
} from "lucide-react";
import {
  fetchMarketplaceQuickView,
  type MarketplaceQuickViewDetail,
  type PublicProductCard,
} from "@/lib/marketplace/actions";
import { toggleWishlist } from "@/lib/marketplace/buyer";
import { trackMarketplaceEvent } from "@/lib/marketplace/analytics";
import {
  MARKETPLACE_CART_KEY,
  type MarketplaceCartItem,
} from "@/lib/marketplace/cart";
import { writeMarketplaceCart } from "@/lib/marketplace/use-cart";
import {
  effectiveProductPrice,
  formatMarketplaceMoney,
} from "@/lib/marketplace/pricing";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

export type MarketplaceQuickViewContextValue = {
  openQuickView: (product: PublicProductCard) => void;
};

export const MarketplaceQuickViewContext =
  createContext<MarketplaceQuickViewContextValue | null>(null);

export function useMarketplaceQuickView() {
  const ctx = useContext(MarketplaceQuickViewContext);
  if (!ctx) {
    throw new Error(
      "useMarketplaceQuickView must be used within MarketplaceQuickViewProvider"
    );
  }
  return ctx;
}

export function MarketplaceQuickViewProvider({
  children,
  isLoggedIn = false,
}: {
  children: ReactNode;
  isLoggedIn?: boolean;
}) {
  const [product, setProduct] = useState<PublicProductCard | null>(null);
  const [open, setOpen] = useState(false);

  const openQuickView = useCallback((p: PublicProductCard) => {
    setProduct(p);
    setOpen(true);
  }, []);

  return (
    <MarketplaceQuickViewContext.Provider value={{ openQuickView }}>
      {children}
      {product ? (
        <ProductQuickViewDrawer
          key={product.id}
          product={product}
          open={open}
          onOpenChange={setOpen}
          isLoggedIn={isLoggedIn}
        />
      ) : null}
    </MarketplaceQuickViewContext.Provider>
  );
}

function ProductQuickViewDrawer({
  product,
  open,
  onOpenChange,
  isLoggedIn,
}: {
  product: PublicProductCard;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const titleId = useId();
  const [detail, setDetail] = useState<MarketplaceQuickViewDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [wished, setWished] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    void fetchMarketplaceQuickView(product.id).then((res) => {
      if (cancelled) return;
      setDetail(res);
      setVariantId(res?.variants[0]?.id ?? null);
      setLoadingDetail(false);
    });

    void trackMarketplaceEvent({
      eventType: "product_view",
      productId: product.id,
      sellerId: product.seller_id,
    });

    return () => {
      cancelled = true;
    };
  }, [open, product.id, product.seller_id]);

  const gallery = useMemo(() => {
    if (detail?.images?.length) return detail.images;
    return product.image_url ? [product.image_url] : [];
  }, [detail, product]);

  const selected = useMemo(
    () => detail?.variants.find((v) => v.id === variantId) ?? null,
    [detail, variantId]
  );

  const unitPrice = selected
    ? effectiveProductPrice(selected)
    : effectiveProductPrice(product);
  const listPrice = selected ? Number(selected.price) : Number(product.price);
  const stock = selected ? selected.stock : product.stock;
  const onSale = unitPrice < listPrice;
  const discountPct =
    onSale && listPrice > 0 ? Math.round((1 - unitPrice / listPrice) * 100) : 0;
  const activeImage = gallery[imageIndex] ?? product.image_url ?? null;
  const displayTitle = selected
    ? `${product.title} (${selected.name})`
    : product.title;

  function requireLogin(action: string) {
    notify.error(`Sign in to ${action}`);
    router.push(
      `/login?redirect=${encodeURIComponent(`/product/${product.id}`)}`
    );
  }

  function addToCart(goCheckout: boolean) {
    if (!isLoggedIn) {
      requireLogin("add items to your cart");
      return;
    }
    if (stock < 1) {
      notify.error("Out of stock");
      return;
    }
    let cart: MarketplaceCartItem[] = [];
    try {
      const raw = localStorage.getItem(MARKETPLACE_CART_KEY);
      if (raw) cart = JSON.parse(raw) as MarketplaceCartItem[];
    } catch {
      cart = [];
    }

    const keyMatch = (i: MarketplaceCartItem) =>
      i.productId === product.id &&
      (i.variantId ?? null) === (variantId ?? null);
    const existing = cart.find(keyMatch);
    const nextQty = (existing?.quantity ?? 0) + qty;
    if (nextQty > stock) {
      notify.error("Not enough stock");
      return;
    }

    const item: MarketplaceCartItem = {
      productId: product.id,
      variantId: variantId,
      variantName: selected?.name ?? null,
      title: displayTitle,
      price: unitPrice,
      quantity: nextQty,
      imageUrl: activeImage ?? product.image_url,
      sellerId: product.seller_id,
      sellerName: product.seller_name,
      stock,
      currency: product.currency,
    };
    const next = existing
      ? cart.map((i) => (keyMatch(i) ? item : i))
      : [...cart, item];
    writeMarketplaceCart(next);
    void trackMarketplaceEvent({
      eventType: "add_to_cart",
      productId: product.id,
      sellerId: product.seller_id,
    });
    notify.success("Added to cart");
    if (goCheckout) router.push("/cart");
  }

  function onWishlist() {
    if (!isLoggedIn) {
      requireLogin("save favorites");
      return;
    }
    startTransition(async () => {
      const res = await toggleWishlist({
        targetType: "product",
        productId: product.id,
      });
      if (res.error) notify.error(res.error);
      else {
        setWished(Boolean(res.wished));
        notify.success(
          res.wished ? "Saved to wishlist" : "Removed from wishlist"
        );
      }
    });
  }

  function prevImage() {
    if (gallery.length < 2) return;
    setImageIndex((i) => (i - 1 + gallery.length) % gallery.length);
  }

  function nextImage() {
    if (gallery.length < 2) return;
    setImageIndex((i) => (i + 1) % gallery.length);
  }

  const blurb =
    detail?.short_description ||
    detail?.description ||
    product.short_description ||
    product.description;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        overlayClassName="z-[70] bg-[var(--m-ink)]/35 supports-backdrop-filter:backdrop-blur-[2px]"
        className={cn(
          "z-[70] gap-0 overflow-hidden border-[var(--m-line)] bg-[var(--m-card)] p-0 shadow-[0_24px_80px_-24px_rgba(7,59,50,0.45)]",
          "inset-x-0 top-auto bottom-0 h-[min(92dvh,100%)] w-full max-w-none rounded-t-[20px] border-t",
          "data-[side=right]:data-ending-style:translate-y-[2rem] data-[side=right]:data-starting-style:translate-y-[2rem]",
          "sm:inset-y-auto sm:top-4 sm:right-3 sm:bottom-0 sm:left-auto sm:h-[calc(100dvh-1rem)] sm:w-[min(520px,65vw)] sm:max-w-[520px] sm:rounded-t-[20px] sm:border sm:border-b-0",
          "sm:data-[side=right]:data-ending-style:translate-x-[2.5rem] sm:data-[side=right]:data-starting-style:translate-x-[2.5rem] sm:data-[side=right]:data-ending-style:translate-y-0 sm:data-[side=right]:data-starting-style:translate-y-0"
        )}
      >
        <div className="flex h-full min-h-0 flex-col">
          <header className="relative shrink-0 bg-[linear-gradient(135deg,#073b32_0%,#0d5c4d_55%,#174b3c_100%)] px-5 pt-5 pb-5 text-white sm:min-h-[88px] sm:px-6 sm:pt-6 sm:pb-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-4 inline-flex size-9 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
              aria-label="Close quick view"
            >
              <X className="size-4" />
            </button>
            <SheetTitle
              id={titleId}
              className="pr-12 font-display text-xl font-semibold tracking-tight text-white sm:text-2xl"
            >
              {product.title}
            </SheetTitle>
            <SheetDescription className="mt-1 text-sm text-white/70">
              {product.category_name || product.seller_name}
              {product.category_name && product.seller_name
                ? ` · ${product.seller_name}`
                : null}
            </SheetDescription>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="space-y-3 px-5 pt-5 sm:px-6">
              <div className="relative aspect-square overflow-hidden rounded-2xl border border-[var(--m-line)] bg-[var(--m-mist)]">
                {activeImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeImage}
                    alt={product.title}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-sm text-[var(--m-muted)]">
                    No image
                  </div>
                )}
                {gallery.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={prevImage}
                      className="absolute top-1/2 left-2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[var(--m-ink)] shadow-sm ring-1 ring-black/5 transition hover:bg-white"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={nextImage}
                      className="absolute top-1/2 right-2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[var(--m-ink)] shadow-sm ring-1 ring-black/5 transition hover:bg-white"
                      aria-label="Next image"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                      {gallery.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          aria-label={`Image ${i + 1}`}
                          onClick={() => setImageIndex(i)}
                          className={cn(
                            "size-1.5 rounded-full transition-colors",
                            i === imageIndex
                              ? "bg-[var(--m-accent)]"
                              : "bg-white/70"
                          )}
                        />
                      ))}
                    </div>
                  </>
                ) : null}
              </div>

              {gallery.length > 1 ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {gallery.map((url, i) => (
                    <button
                      key={`${url}-${i}`}
                      type="button"
                      onClick={() => setImageIndex(i)}
                      className={cn(
                        "size-14 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                        i === imageIndex
                          ? "border-[var(--m-accent)]"
                          : "border-transparent ring-1 ring-[var(--m-line)]"
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-6">
              <div className="flex flex-wrap items-center gap-2">
                {product.category_name ? (
                  <span className="rounded-full border border-[var(--m-line)] bg-[var(--m-mist)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--m-ink-soft)]">
                    {product.category_name}
                  </span>
                ) : null}
                {product.avg_rating != null ? (
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--m-ink-soft)]">
                    <Star className="size-3.5 fill-[var(--m-accent)] text-[var(--m-accent)]" />
                    {product.avg_rating.toFixed(1)}
                    <span className="text-[var(--m-muted)]">
                      ({product.review_count})
                    </span>
                  </span>
                ) : null}
                <span
                  className={cn(
                    "text-xs font-medium",
                    stock > 0 ? "text-[var(--m-ink-soft)]" : "text-red-600"
                  )}
                >
                  {stock > 0 ? `${stock} in stock` : "Out of stock"}
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-2">
                <p className="font-display text-3xl font-semibold tracking-tight text-[var(--m-ink)]">
                  {formatMarketplaceMoney(unitPrice, product.currency)}
                </p>
                {onSale ? (
                  <>
                    <p className="text-sm text-[var(--m-muted)] line-through">
                      {formatMarketplaceMoney(listPrice, product.currency)}
                    </p>
                    <span className="rounded-sm bg-[var(--m-accent)]/20 px-1.5 py-0.5 text-[11px] font-semibold text-[var(--m-ink)]">
                      −{discountPct}%
                    </span>
                  </>
                ) : null}
              </div>

              {blurb || loadingDetail ? (
                <p className="text-sm leading-relaxed text-[var(--m-muted)]">
                  {loadingDetail && !detail ? "Loading details…" : blurb}
                </p>
              ) : null}

              {detail?.variants && detail.variants.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--m-muted)]">
                    Options
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {detail.variants.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setVariantId(v.id);
                          setQty(1);
                        }}
                        className={cn(
                          "rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors",
                          variantId === v.id
                            ? "border-[var(--m-ink)] bg-[var(--m-ink)] text-[var(--m-paper)]"
                            : "border-[var(--m-line)] text-[var(--m-ink-soft)] hover:border-[var(--m-ink)]"
                        )}
                      >
                        {v.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--m-muted)]">
                  Quantity
                </p>
                <div className="mt-2 inline-flex items-center border border-[var(--m-line)]">
                  <button
                    type="button"
                    className="size-9 text-[var(--m-ink)] disabled:opacity-40"
                    disabled={qty <= 1}
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="min-w-10 text-center text-sm font-semibold tabular-nums text-[var(--m-ink)]">
                    {qty}
                  </span>
                  <button
                    type="button"
                    className="size-9 text-[var(--m-ink)] disabled:opacity-40"
                    disabled={qty >= stock || stock < 1}
                    onClick={() => setQty((q) => Math.min(stock, q + 1))}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>

              <p className="text-xs text-[var(--m-muted)]">
                Sold by{" "}
                <Link
                  href={`/shop/seller/${product.seller_slug}`}
                  className="font-medium text-[var(--m-accent)] underline-offset-2 hover:underline"
                  onClick={() => onOpenChange(false)}
                >
                  {product.seller_name}
                </Link>
              </p>
            </div>
          </div>

          <div className="shrink-0 border-t border-[var(--m-line)] bg-[var(--m-card)] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="size-11 shrink-0 border-[var(--m-line)]"
                disabled={pending}
                onClick={onWishlist}
                aria-label="Wishlist"
              >
                <Heart
                  className={cn(
                    "size-4",
                    wished && "fill-current text-[var(--m-accent)]"
                  )}
                />
              </Button>
              <Button
                type="button"
                className="h-11 flex-1 gap-2 border-0 bg-[var(--m-accent)] text-[var(--m-ink)] hover:bg-[#b8955a] hover:text-[var(--m-ink)]"
                disabled={stock < 1}
                onClick={() => addToCart(false)}
              >
                <ShoppingBag className="size-4" />
                Add to cart
              </Button>
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                className="h-11 flex-1 bg-[var(--m-ink)] text-[var(--m-paper)] hover:bg-[var(--m-ink-soft)]"
                disabled={stock < 1}
                onClick={() => addToCart(true)}
              >
                Buy now
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 border-[var(--m-line)] px-4"
                render={
                  <Link
                    href={`/product/${product.id}`}
                    onClick={() => onOpenChange(false)}
                  />
                }
              >
                Full details
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
