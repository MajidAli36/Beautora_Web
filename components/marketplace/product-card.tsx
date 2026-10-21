"use client";

import { useContext } from "react";
import Link from "next/link";
import { Eye, Star } from "lucide-react";
import type { PublicProductCard } from "@/lib/marketplace/actions";
import {
  effectiveProductPrice,
  formatMarketplaceMoney,
} from "@/lib/marketplace/pricing";
import { MarketplaceQuickViewContext } from "@/components/marketplace/product-quick-view";
import { cn } from "@/lib/utils";

export function MarketplaceProductCard({
  product,
  className,
}: {
  product: PublicProductCard;
  className?: string;
}) {
  const quickView = useContext(MarketplaceQuickViewContext);
  const price = effectiveProductPrice(product);
  const list = Number(product.price);
  const onSale = price < list;

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden border border-[var(--m-line)] bg-[var(--m-paper)] text-left transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-[var(--m-mist)]">
        <Link href={`/product/${product.id}`} className="absolute inset-0 z-0">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt=""
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-[var(--m-muted)]">
              No image
            </div>
          )}
          <span className="sr-only">{product.title}</span>
        </Link>
        {onSale ? (
          <span className="pointer-events-none absolute top-2 left-2 z-[1] bg-[var(--m-ink)] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--m-paper)]">
            Sale
          </span>
        ) : null}
        {quickView ? (
          <button
            type="button"
            className={cn(
              "absolute inset-x-2 bottom-2 z-[1] inline-flex items-center justify-center gap-1.5 rounded-sm bg-[var(--m-ink)]/90 px-3 py-2 text-[11px] font-semibold tracking-wide text-[var(--m-paper)] shadow-sm backdrop-blur-sm transition",
              "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100",
              "hover:bg-[var(--m-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--m-accent)]"
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              quickView.openQuickView(product);
            }}
          >
            <Eye className="size-3.5" aria-hidden />
            Quick View
          </button>
        ) : null}
      </div>
      <Link
        href={`/product/${product.id}`}
        className="flex flex-1 flex-col gap-1 p-3"
      >
        <p className="line-clamp-2 text-sm font-semibold text-[var(--m-ink)]">
          {product.title}
        </p>
        <p className="text-[11px] text-[var(--m-muted)]">{product.seller_name}</p>
        {product.avg_rating != null ? (
          <p className="flex items-center gap-1 text-[11px] text-[var(--m-ink-soft)]">
            <Star className="size-3 fill-current" />
            {product.avg_rating.toFixed(1)}
            <span className="text-[var(--m-muted)]">({product.review_count})</span>
          </p>
        ) : null}
        <div className="mt-auto flex items-baseline gap-2">
          <p className="text-sm font-semibold text-[var(--m-ink)]">
            {formatMarketplaceMoney(price, product.currency)}
          </p>
          {onSale ? (
            <p className="text-xs text-[var(--m-muted)] line-through">
              {formatMarketplaceMoney(list, product.currency)}
            </p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
