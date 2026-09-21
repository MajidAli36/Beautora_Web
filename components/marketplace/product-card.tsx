"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import type { PublicProductCard } from "@/lib/marketplace/actions";
import {
  effectiveProductPrice,
  formatMarketplaceMoney,
} from "@/lib/marketplace/pricing";
import { cn } from "@/lib/utils";

export function MarketplaceProductCard({
  product,
  className,
}: {
  product: PublicProductCard;
  className?: string;
}) {
  const price = effectiveProductPrice(product);
  const list = Number(product.price);
  const onSale = price < list;

  return (
    <Link
      href={`/product/${product.id}`}
      className={cn(
        "group flex flex-col overflow-hidden border border-[var(--m-line)] bg-[var(--m-paper)] text-left transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-[var(--m-mist)]">
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
        {onSale ? (
          <span className="absolute top-2 left-2 bg-[var(--m-ink)] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--m-paper)]">
            Sale
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
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
            {formatMarketplaceMoney(price)}
          </p>
          {onSale ? (
            <p className="text-xs text-[var(--m-muted)] line-through">
              {formatMarketplaceMoney(list)}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
