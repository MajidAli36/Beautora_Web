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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.types";
import { currencyFromCountry } from "@/lib/currency/from-country";
import { marketplaceProductPath } from "@/lib/marketplace/product-url";

type Product = Database["public"]["Tables"]["marketplace_products"]["Row"];
type Variant = Database["public"]["Tables"]["marketplace_product_variants"]["Row"];
type ImageRow = Database["public"]["Tables"]["marketplace_product_images"]["Row"];
type Review = Database["public"]["Tables"]["marketplace_reviews"]["Row"];

function hasMeaningfulText(value: string | null | undefined) {
  return Boolean(value?.replace(/\s+/g, " ").trim());
}

/** Rich-text editors often save empty `<p></p>` / `&nbsp;` — treat as no content. */
function hasMeaningfulHtml(html: string | null | undefined) {
  if (!html?.trim()) return false;
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0;
}

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
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);

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
  const onSale = unitPrice < listPrice;
  const discountPct =
    onSale && listPrice > 0
      ? Math.round((1 - unitPrice / listPrice) * 100)
      : 0;

  const shortDescription = hasMeaningfulText(product.short_description)
    ? product.short_description!.trim()
    : null;
  const descriptionHtml = hasMeaningfulHtml(product.description_html)
    ? product.description_html
    : null;
  const descriptionPlain = hasMeaningfulText(product.description)
    ? product.description!.trim()
    : null;
  const plainDistinct =
    descriptionPlain &&
    shortDescription &&
    descriptionPlain.toLowerCase() === shortDescription.toLowerCase()
      ? null
      : descriptionPlain;
  const hasFullDescription = Boolean(descriptionHtml || plainDistinct);

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

  const productHref = marketplaceProductPath(product);

  function requireLogin(action: string) {
    notify.error(`Sign in to ${action}`);
    router.push(`/login?redirect=${encodeURIComponent(productHref)}`);
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
        <div className="relative aspect-square overflow-hidden border border-[var(--m-line)] bg-[var(--m-mist)]">
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
          {discountPct > 0 ? (
            <span className="absolute top-4 left-4 bg-[var(--m-ink)] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[var(--m-paper)]">
              −{discountPct}%
            </span>
          ) : null}
        </div>
        {gallery.length > 1 ? (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {gallery.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => setActiveImage(url)}
                className={cn(
                  "size-16 shrink-0 overflow-hidden border transition-opacity",
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

      <div className="flex min-w-0 flex-col">
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
            <Star className="size-4 fill-[var(--m-accent)] text-[var(--m-accent)]" />
            <span className="font-medium tabular-nums">{avg.toFixed(1)}</span>
            <span className="text-[var(--m-muted)]">
              · {reviews.length} review{reviews.length === 1 ? "" : "s"}
            </span>
          </p>
        ) : (
          <p className="mt-3 text-sm text-[var(--m-muted)]">No reviews yet</p>
        )}

        <div className="mt-6 flex flex-wrap items-baseline gap-3">
          <p className="font-display text-3xl font-semibold text-[var(--m-ink)]">
            {formatMarketplaceMoney(unitPrice, currency)}
          </p>
          {onSale ? (
            <p className="text-base text-[var(--m-muted)] line-through">
              {formatMarketplaceMoney(listPrice, currency)}
            </p>
          ) : null}
        </div>

        {shortDescription ? (
          <p className="mt-5 text-base leading-relaxed text-[var(--m-ink-soft)]">
            {shortDescription}
          </p>
        ) : null}

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
          <div className="flex items-center border border-[var(--m-line)] bg-[var(--m-card)]">
            <button
              type="button"
              className="px-3 py-2.5 text-sm text-[var(--m-ink)] disabled:opacity-40"
              disabled={qty <= 1}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="min-w-8 text-center text-sm font-semibold tabular-nums text-[var(--m-ink)]">
              {qty}
            </span>
            <button
              type="button"
              className="px-3 py-2.5 text-sm text-[var(--m-ink)] disabled:opacity-40"
              disabled={qty >= stock || stock < 1}
              onClick={() => setQty((q) => Math.min(stock, q + 1))}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <button
            type="button"
            disabled={stock < 1 || pending}
            onClick={addToCart}
            className={cn(
              "inline-flex h-11 items-center justify-center gap-2 bg-[var(--m-accent)] px-6 text-sm font-semibold tracking-wide text-[var(--m-ink)] transition-colors",
              "hover:bg-[#b8955a] disabled:opacity-50"
            )}
          >
            <ShoppingBag className="size-4" />
            Add to cart
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onWishlist}
            className={cn(
              "inline-flex h-11 items-center justify-center gap-2 border border-[var(--m-ink)] bg-[var(--m-card)] px-5 text-sm font-semibold tracking-wide text-[var(--m-ink)] transition-colors",
              "hover:bg-[var(--m-ink)] hover:text-[var(--m-paper)] disabled:opacity-50"
            )}
          >
            <Heart
              className={cn(
                "size-4",
                wished && "fill-[var(--m-accent)] text-[var(--m-accent)]"
              )}
            />
            Save
          </button>
        </div>

        {hasFullDescription ? (
          <section className="mt-10 border-t border-[var(--m-line)] pt-8">
            <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--m-muted)]">
              Description
            </h2>
            {descriptionHtml ? (
              <div
                className="prose prose-sm mt-4 max-w-none text-[var(--m-ink-soft)] prose-headings:font-display prose-headings:text-[var(--m-ink)] prose-a:text-[var(--m-ink)] prose-a:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            ) : plainDistinct ? (
              <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-[var(--m-ink-soft)]">
                {plainDistinct}
              </p>
            ) : null}
          </section>
        ) : null}

        <section className="mt-10 border-t border-[var(--m-line)] pt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--m-muted)]">
                Reviews
              </h2>
              <p className="mt-2 text-sm text-[var(--m-muted)]">
                Anyone can leave a review — no account needed.
              </p>
            </div>
            {avg != null ? (
              <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--m-ink)]">
                <Star className="size-4 fill-[var(--m-accent)] text-[var(--m-accent)]" />
                {avg.toFixed(1)} / 5
              </p>
            ) : null}
          </div>

          <ul className="mt-5 space-y-4">
            {reviews.length === 0 ? (
              <li className="border border-dashed border-[var(--m-line)] bg-[var(--m-mist)]/60 px-4 py-5 text-sm text-[var(--m-muted)]">
                Be the first to review this product.
              </li>
            ) : (
              reviews.map((r) => (
                <li
                  key={r.id}
                  className="border-b border-[var(--m-line)] pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--m-ink)]">
                      {r.reviewer_name}
                    </p>
                    <span className="flex items-center gap-0.5 text-[var(--m-accent)]">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "size-3.5",
                            i < r.rating
                              ? "fill-current"
                              : "fill-transparent text-[var(--m-line)]"
                          )}
                        />
                      ))}
                    </span>
                  </div>
                  {r.comment ? (
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--m-ink-soft)]">
                      {r.comment}
                    </p>
                  ) : null}
                </li>
              ))
            )}
          </ul>

          <form
            className="mt-8 space-y-4 border border-[var(--m-line)] bg-[var(--m-mist)]/40 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              fd.set("product_id", product.id);
              fd.set("rating", String(rating));
              startTransition(async () => {
                const res = await submitMarketplaceReview(fd);
                if (res.error) notify.error(res.error);
                else {
                  notify.success("Thanks — your review is live.");
                  e.currentTarget.reset();
                  setRating(5);
                  router.refresh();
                }
              });
            }}
          >
            <div>
              <p className="text-sm font-semibold text-[var(--m-ink)]">
                Write a review
              </p>
              <p className="mt-1 text-xs text-[var(--m-muted)]">
                Guests welcome. Share your experience with this product.
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--m-muted)]">
                Rating
              </p>
              <div
                className="flex items-center gap-1"
                onMouseLeave={() => setHoverRating(0)}
              >
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = (hoverRating || rating) >= n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHoverRating(n)}
                      className="rounded p-0.5 transition-transform hover:scale-110"
                      aria-label={`${n} star${n === 1 ? "" : "s"}`}
                    >
                      <Star
                        className={cn(
                          "size-6",
                          active
                            ? "fill-[var(--m-accent)] text-[var(--m-accent)]"
                            : "fill-transparent text-[var(--m-line)]"
                        )}
                      />
                    </button>
                  );
                })}
                <span className="ml-2 text-xs tabular-nums text-[var(--m-muted)]">
                  {rating} / 5
                </span>
              </div>
              <input type="hidden" name="rating" value={rating} />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="reviewer_name"
                className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--m-muted)]"
              >
                Your name
              </label>
              <Input
                id="reviewer_name"
                name="reviewer_name"
                placeholder="e.g. Sara"
                required
                className="h-11 border-[var(--m-line)] bg-[var(--m-card)]"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="comment"
                className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--m-muted)]"
              >
                Comment
              </label>
              <Textarea
                id="comment"
                name="comment"
                rows={3}
                placeholder="What did you like? How was the quality?"
                className="border-[var(--m-line)] bg-[var(--m-card)]"
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className={cn(
                "inline-flex h-11 w-full items-center justify-center bg-[var(--m-ink)] px-5 text-sm font-semibold tracking-wide text-[var(--m-paper)] transition-colors sm:w-auto",
                "hover:bg-[var(--m-ink-soft)] disabled:opacity-50"
              )}
            >
              {pending ? "Submitting…" : "Submit review"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
