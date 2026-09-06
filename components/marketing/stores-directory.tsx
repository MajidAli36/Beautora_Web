"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import type { PublicStore } from "@/lib/actions/stores";
import { StoreCardMedia } from "@/components/marketing/store-card-media";
import { cn } from "@/lib/utils";

function storeBlurb(store: PublicStore): string {
  if (store.tagline?.trim()) return store.tagline.trim();
  if (store.highlightServices.length > 0) {
    return store.highlightServices.join(" · ");
  }
  if (store.serviceCount > 0) {
    return `${store.serviceCount} service${store.serviceCount === 1 ? "" : "s"} in catalog`;
  }
  return "New on Beautora — services coming soon.";
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function StoresDirectory({ stores }: { stores: PublicStore[] }) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState<string>("all");
  const deferredQuery = useDeferredValue(query);

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const s of stores) {
      const c = s.city?.trim();
      if (c) set.add(c);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
  }, [stores]);

  const filtered = useMemo(() => {
    const q = normalize(deferredQuery);
    return stores.filter((store) => {
      if (city !== "all") {
        const storeCity = store.city?.trim() ?? "";
        if (storeCity.toLowerCase() !== city.toLowerCase()) return false;
      }
      if (!q) return true;
      const haystack = [
        store.name,
        store.slug,
        store.city ?? "",
        store.address ?? "",
        store.tagline ?? "",
        ...store.highlightServices,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [stores, city, deferredQuery]);

  const hasFilters = query.trim().length > 0 || city !== "all";

  return (
    <div className="space-y-10">
      <div className="space-y-5 border-b border-[var(--m-line)] pb-8">
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[var(--m-muted)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by salon name, city, service…"
            className="h-12 w-full border border-[var(--m-line)] bg-[var(--m-paper)] pr-11 pl-11 text-sm text-[var(--m-ink)] outline-none transition-colors placeholder:text-[var(--m-muted)] focus:border-[var(--m-ink)]"
            aria-label="Search stores"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-3 -translate-y-1/2 p-1 text-[var(--m-muted)] hover:text-[var(--m-ink)]"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--m-muted)]">
            City
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <CityChip
              active={city === "all"}
              onClick={() => setCity("all")}
              label={`All cities (${stores.length})`}
            />
            {cities.map((c) => {
              const count = stores.filter(
                (s) => (s.city ?? "").toLowerCase() === c.toLowerCase()
              ).length;
              return (
                <CityChip
                  key={c}
                  active={city.toLowerCase() === c.toLowerCase()}
                  onClick={() => setCity(c)}
                  label={`${c} (${count})`}
                />
              );
            })}
            {cities.length === 0 && (
              <p className="text-sm text-[var(--m-muted)]">
                No cities set yet — salons add city under Settings → Store profile.
              </p>
            )}
          </div>
        </div>

        <p className="text-sm text-[var(--m-muted)]">
          {filtered.length === 0
            ? "No salons match your search."
            : `Showing ${filtered.length} of ${stores.length} salon${stores.length === 1 ? "" : "s"}`}
          {hasFilters && (
            <>
              {" · "}
              <button
                type="button"
                className="font-medium text-[var(--m-ink)] underline-offset-4 hover:underline"
                onClick={() => {
                  setQuery("");
                  setCity("all");
                }}
              >
                Clear filters
              </button>
            </>
          )}
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="border-y border-[var(--m-line)] py-10 text-[var(--m-muted)]">
          Try another city or name.{" "}
          <Link href="/signup" className="underline-offset-4 hover:underline">
            Open your salon
          </Link>{" "}
          to be listed here.
        </p>
      ) : (
        <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((store) => (
            <li key={store.id}>
              <Link href={`/stores/${store.slug}`} className="group block">
                <StoreCardMedia store={store} />
                <div className="mt-5">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--m-muted)]">
                    {store.city?.trim() || `/${store.slug}`}
                  </p>
                  <h3 className="mt-1.5 font-display text-2xl font-medium text-[var(--m-ink)] transition-colors group-hover:text-[var(--m-accent)]">
                    {store.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--m-muted)]">
                    {storeBlurb(store)}
                  </p>
                  <p className="mt-3 text-sm text-[var(--m-ink-soft)]">
                    {store.serviceCount} service{store.serviceCount === 1 ? "" : "s"}
                    {store.staffCount > 0
                      ? ` · ${store.staffCount} stylist${store.staffCount === 1 ? "" : "s"}`
                      : ""}
                  </p>
                  <span className="mt-4 inline-flex text-sm font-semibold tracking-wide text-[var(--m-ink)] underline-offset-4 group-hover:underline">
                    View store →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CityChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center px-4 text-sm font-medium tracking-wide transition-colors",
        active
          ? "bg-[var(--m-ink)] text-[var(--m-paper)]"
          : "border border-[var(--m-line)] text-[var(--m-ink-soft)] hover:border-[var(--m-ink)] hover:text-[var(--m-ink)]"
      )}
    >
      {label}
    </button>
  );
}
