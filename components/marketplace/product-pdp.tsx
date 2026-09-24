"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, ShoppingBag, Star } from "lucide-react";
import { submitMarketplaceReview } from "@/lib/marketplace/actions";
import { toggleWishlist } from "@/lib/marketplace/buyer";
import { trackMarketplaceEvent } from "@/lib/marketplace/analytics";
import {
  MARKETPLACE_CART_KEY,
  type MarketplaceCartItem,
} from "@/lib/marketplace/cart";
import {
  effectiveProductPrice,
  formatMarketplaceMoney,
} from "@/lib/marketplace/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.types";
import { currencyFromCountry } from "@/lib/currency/from-country";

type Product = Database["public"]["Tables"]["marketplace_products"]["Row"];
type Variant = Database["public"]["Tables"]["marketplace_product_variants"]["Row"];
type ImageRow = Database["public"]["Tables"]["marketplace_product_images"]["Row"];
type Review = Database["public"]["Tables"]["marketplace_reviews"]["Row"];

export function MarketplaceProductPdp({
  product,
  seller,
  categoryName,
  brandName,
  images,
  variants,
  reviews,
  isLoggedIn,
  currency: currencyProp,
}: {
  product: Product;
  seller: {
    shop_name: string;
    slug: string;
    logo_url?: string | null;
    city?: string | null;
    country?: string | null;
  };
  categoryName: string | null;
  brandName: string | null;
  images: ImageRow[];
  variants: Variant[];
  reviews: Review[];
  isLoggedIn: boolean;
  currency?: string;
}) {
  const currency = currencyProp || currencyFromCountry(seller.country).code;
  const router = useRouter();
  const [variantId, setVariantId] = useState<string | null>(
    variants[0]?.id ?? null
  );
  const [qty, setQty] = useState(1);
  const [pending, startTransition] = useTransition();
  const [wished, setWished] = useState(false);
  const [activeImage, setActiveImage] = useState(
    images[0]?.url ?? product.image_url ?? null
  );

  const selected = useMemo(
    () => variants.find((v) => v.id === variantId) ?? null,
    [variants, variantId]
  );

  const unitPrice = selected
    ? effectiveProductPrice(selected)
    : effectiveProductPrice(product);
  const listPrice = selected ? Number(selected.price) : Number(product.price);
  const stock = selected ? selected.stock : product.stock;
  const title = selected ? `${product.title} (${selected.name})` : product.title;

  useEffect(() => {
    void trackMarketplaceEvent({
      eventType: "product_view",
      productId: product.id,
      sellerId: product.seller_id,
    });
  }, [product.id, product.seller_id]);

  const persistCart = useCallback((next: MarketplaceCartItem[]) => {
    try {
      localStorage.setItem(MARKETPLACE_CART_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  function requireLogin(action: string) {
    notify.error(`Sign in to ${action}`);
    router.push(`/login?redirect=${encodeURIComponent(`/product/${product.id}`)}`);
  }

  function addToCart() {
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
      i.productId === product.id && (i.variantId ?? null) === (variantId ?? null);
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
      title,
      price: unitPrice,
      quantity: nextQty,
      imageUrl: activeImage ?? product.image_url,
      sellerId: product.seller_id,
      sellerName: seller.shop_name,
      stock,
      currency,
    };
    const next = existing
      ? cart.map((i) => (keyMatch(i) ? item : i))
      : [...cart, item];
    persistCart(next);
    void trackMarketplaceEvent({
      eventType: "add_to_cart",
      productId: product.id,
      sellerId: product.seller_id,
    });
    notify.success("Added to cart");
    router.push("/cart");
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
        notify.success(res.wished ? "Saved to wishlist" : "Removed from wishlist");
      }
    });
  }

  const avg =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null;

  const gallery = [
    ...(product.image_url ? [product.image_url] : []),
    ...images.map((i) => i.url),
  ].filter((u, i, a) => a.indexOf(u) === i);

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-2 lg:gap-14 lg:py-14">
      <div>
        <div className="aspect-square overflow-hidden bg-[var(--m-mist)]">
          {activeImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={activeImage} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-sm text-[var(--m-muted)]">
              No image
            </div>
          )}
        </div>
        {gallery.length > 1 ? (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {gallery.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => setActiveImage(url)}
                className={cn(
                  "size-16 shrink-0 overflow-hidden border",
                  activeImage === url
                    ? "border-[var(--m-ink)]"
                    : "border-[var(--m-line)] opacity-80 hover:opacity-100"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}
        {product.video_url ? (
          <div className="mt-4 overflow-hidden border border-[var(--m-line)] bg-black">
            <video
              src={product.video_url}
              controls
              playsInline
              poster={activeImage ?? undefined}
              className="max-h-80 w-full"
            />
          </div>
        ) : null}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
          {categoryName ?? "Marketplace"}
          {brandName ? ` · ${brandName}` : ""}
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-4xl">
          {product.title}
        </h1>
        <p className="mt-2 text-sm text-[var(--m-muted)]">
          by{" "}
          <Link
            href={`/shop/seller/${seller.slug}`}
            className="font-medium text-[var(--m-ink)] underline-offset-4 hover:underline"
          >
            {seller.shop_name}
          </Link>
          {seller.city ? ` · ${seller.city}` : ""}
        </p>

        {avg != null ? (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-[var(--m-ink-soft)]">
            <Star className="size-4 fill-current" />
            {avg.toFixed(1)} · {reviews.length} review{reviews.length === 1 ? "" : "s"}
          </p>
        ) : null}

        <div className="mt-6 flex items-baseline gap-3">
          <p className="font-display text-3xl font-semibold text-[var(--m-ink)]">
            {formatMarketplaceMoney(unitPrice, currency)}
          </p>
          {unitPrice < listPrice ? (
            <p className="text-base text-[var(--m-muted)] line-through">
              {formatMarketplaceMoney(listPrice, currency)}
            </p>
          ) : null}
        </div>

        {(product.short_description || product.description_html || product.description) && (
          <div className="mt-5 space-y-3">
            {product.short_description ? (
              <p className="text-base leading-relaxed text-[var(--m-ink-soft)]">
                {product.short_description}
              </p>
            ) : null}
            {product.description_html ? (
              <div
                className="prose prose-sm max-w-none text-[var(--m-ink-soft)] [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                dangerouslySetInnerHTML={{ __html: product.description_html }}
              />
            ) : product.description && !product.short_description ? (
              <p className="text-base leading-relaxed text-[var(--m-ink-soft)]">
                {product.description}
              </p>
            ) : product.description && product.short_description ? (
              <p className="text-sm leading-relaxed text-[var(--m-muted)] whitespace-pre-wrap">
                {product.description}
              </p>
            ) : null}
          </div>
        )}

        {variants.length > 0 ? (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--m-muted)]">
              Options
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setVariantId(v.id);
                    if (v.image_url) setActiveImage(v.image_url);
                    setQty(1);
                  }}
                  className={cn(
                    "border px-3 py-2 text-sm font-medium transition-colors",
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

        <p className="mt-4 text-xs text-[var(--m-muted)]">
          {stock > 0
            ? `${stock} in stock · COD or card at checkout (seller-dependent)`
            : "Out of stock"}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center border border-[var(--m-line)]">
            <button
              type="button"
              className="px-3 py-2 text-sm"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <span className="min-w-8 text-center text-sm font-medium">{qty}</span>
            <button
              type="button"
              className="px-3 py-2 text-sm"
              onClick={() => setQty((q) => Math.min(stock, q + 1))}
            >
              +
            </button>
          </div>
          <Button
            type="button"
            className="h-11 gap-2 px-6"
            disabled={stock < 1 || pending}
            onClick={addToCart}
          >
            <ShoppingBag className="size-4" />
            Add to cart
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 gap-2"
            disabled={pending}
            onClick={onWishlist}
          >
            <Heart className={cn("size-4", wished && "fill-current")} />
            Save
          </Button>
        </div>

        <div className="mt-10 border-t border-[var(--m-line)] pt-8">
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--m-muted)]">
            Reviews
          </h2>
          <ul className="mt-4 space-y-4">
            {reviews.length === 0 ? (
              <li className="text-sm text-[var(--m-muted)]">No reviews yet.</li>
            ) : (
              reviews.map((r) => (
                <li key={r.id} className="border-b border-[var(--m-line)] pb-4">
                  <p className="text-sm font-medium text-[var(--m-ink)]">
                    {r.reviewer_name} · {r.rating}★
                  </p>
                  {r.comment ? (
                    <p className="mt-1 text-sm text-[var(--m-muted)]">{r.comment}</p>
                  ) : null}
                </li>
              ))
            )}
          </ul>
          <form
            className="mt-6 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              fd.set("product_id", product.id);
              startTransition(async () => {
                const res = await submitMarketplaceReview(fd);
                if (res.error) notify.error(res.error);
                else {
                  notify.success("Review submitted");
                  e.currentTarget.reset();
                  router.refresh();
                }
              });
            }}
          >
            <Input name="reviewer_name" placeholder="Your name" required />
            <select
              name="rating"
              defaultValue="5"
              className="flex h-10 w-full border border-[var(--m-line)] bg-transparent px-3 text-sm"
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
        </div>
      </div>
    </div>
  );
}
