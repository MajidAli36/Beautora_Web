"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMarketplaceMoney } from "@/lib/marketplace/pricing";

export type ShopSort =
  | "newest"
  | "price_asc"
  | "price_desc"
  | "rating"
  | "discount";

export type ShopFilterState = {
  categorySlugs: string[];
  countries: string[];
  minPrice: number;
  maxPrice: number;
  minRating: number | null;
};

type CategoryOption = {
  id: string;
  slug: string;
  name: string;
  count: number;
};

type CountryOption = {
  name: string;
  count: number;
  currency: string;
};

type ShopFiltersProps = {
  categories: CategoryOption[];
  countries: CountryOption[];
  priceBounds: { min: number; max: number; currency: string };
  filters: ShopFilterState;
  onChange: (next: ShopFilterState) => void;
  onClear: () => void;
  className?: string;
};

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group border-b border-[var(--m-line)] py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--m-ink)] [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="size-3.5 text-[var(--m-muted)] transition group-open:rotate-180" />
      </summary>
      <div className="mt-3 space-y-2">{children}</div>
    </details>
  );
}

function CheckRow({
  checked,
  label,
  count,
  onChange,
}: {
  checked: boolean;
  label: string;
  count?: number;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[var(--m-ink-soft)] hover:text-[var(--m-ink)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-3.5 accent-[var(--m-ink)]"
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count != null ? (
        <span className="tabular-nums text-[11px] text-[var(--m-muted)]">{count}</span>
      ) : null}
    </label>
  );
}

export function ShopFilters({
  categories,
  countries,
  priceBounds,
  filters,
  onChange,
  onClear,
  className,
}: ShopFiltersProps) {
  const span = Math.max(1, priceBounds.max - priceBounds.min);
  const minPct = ((filters.minPrice - priceBounds.min) / span) * 100;
  const maxPct = ((filters.maxPrice - priceBounds.min) / span) * 100;

  const hasActive =
    filters.categorySlugs.length > 0 ||
    filters.countries.length > 0 ||
    filters.minRating != null ||
    filters.minPrice > priceBounds.min ||
    filters.maxPrice < priceBounds.max;

  return (
    <aside
      className={cn(
        "flex h-full flex-col border border-[var(--m-line)] bg-[var(--m-card)]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--m-line)] px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--m-ink)]">
          Filters
        </p>
        {hasActive ? (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] font-semibold text-[var(--m-accent)] underline-offset-2 hover:underline"
          >
            Clear all
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {categories.length > 0 ? (
          <Section title="Categories">
            {categories.map((c) => (
              <CheckRow
                key={c.id}
                checked={filters.categorySlugs.includes(c.slug)}
                label={c.name}
                count={c.count}
                onChange={(on) =>
                  onChange({
                    ...filters,
                    categorySlugs: on
                      ? [...filters.categorySlugs, c.slug]
                      : filters.categorySlugs.filter((s) => s !== c.slug),
                  })
                }
              />
            ))}
          </Section>
        ) : null}

        <Section title="Price range">
          <p className="mb-3 text-xs text-[var(--m-muted)]">
            {formatMarketplaceMoney(filters.minPrice, priceBounds.currency)} –{" "}
            {formatMarketplaceMoney(filters.maxPrice, priceBounds.currency)}
          </p>
          <div className="relative h-6">
            <div className="absolute top-1/2 right-0 left-0 h-1 -translate-y-1/2 rounded-full bg-[var(--m-line)]" />
            <div
              className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[var(--m-ink)]"
              style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
            />
            <input
              type="range"
              min={priceBounds.min}
              max={priceBounds.max}
              step={Math.max(1, Math.round(span / 100))}
              value={filters.minPrice}
              onChange={(e) => {
                const v = Number(e.target.value);
                onChange({
                  ...filters,
                  minPrice: Math.min(v, filters.maxPrice),
                });
              }}
              className="pointer-events-none absolute inset-0 z-10 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--m-ink)] [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[var(--m-ink)]"
              aria-label="Minimum price"
            />
            <input
              type="range"
              min={priceBounds.min}
              max={priceBounds.max}
              step={Math.max(1, Math.round(span / 100))}
              value={filters.maxPrice}
              onChange={(e) => {
                const v = Number(e.target.value);
                onChange({
                  ...filters,
                  maxPrice: Math.max(v, filters.minPrice),
                });
              }}
              className="pointer-events-none absolute inset-0 z-20 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--m-ink)] [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[var(--m-ink)]"
              aria-label="Maximum price"
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] tabular-nums text-[var(--m-muted)]">
            <span>{formatMarketplaceMoney(priceBounds.min, priceBounds.currency)}</span>
            <span>{formatMarketplaceMoney(priceBounds.max, priceBounds.currency)}</span>
          </div>
        </Section>

        <Section title="Rating">
          {[4, 3, 2, 1].map((n) => (
            <label
              key={n}
              className="flex cursor-pointer items-center gap-2.5 text-sm text-[var(--m-ink-soft)] hover:text-[var(--m-ink)]"
            >
              <input
                type="radio"
                name="min-rating"
                checked={filters.minRating === n}
                onChange={() => onChange({ ...filters, minRating: n })}
                className="size-3.5 accent-[var(--m-ink)]"
              />
              <span>{n}★ &amp; up</span>
            </label>
          ))}
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[var(--m-ink-soft)] hover:text-[var(--m-ink)]">
            <input
              type="radio"
              name="min-rating"
              checked={filters.minRating == null}
              onChange={() => onChange({ ...filters, minRating: null })}
              className="size-3.5 accent-[var(--m-ink)]"
            />
            <span>Any rating</span>
          </label>
        </Section>

        {countries.length > 0 ? (
          <Section title="Country">
            <p className="mb-2 text-[11px] leading-relaxed text-[var(--m-muted)]">
              Based on each seller&apos;s store country (set dynamically from published shops).
            </p>
            {countries.map((c) => (
              <CheckRow
                key={c.name}
                checked={filters.countries.includes(c.name)}
                label={`${c.name} · ${c.currency}`}
                count={c.count}
                onChange={(on) =>
                  onChange({
                    ...filters,
                    countries: on
                      ? [...filters.countries, c.name]
                      : filters.countries.filter((x) => x !== c.name),
                  })
                }
              />
            ))}
          </Section>
        ) : null}
      </div>
    </aside>
  );
}

export const SHOP_SORT_OPTIONS: { value: ShopSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
  { value: "discount", label: "Biggest discount" },
];
