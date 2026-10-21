"use client";

import { useState } from "react";
import Link from "next/link";
import type { PublicStore } from "@/lib/actions/stores";
import { StoreCardMedia } from "@/components/marketing/store-card-media";
import { cn } from "@/lib/utils";

const INITIAL_VISIBLE = 9;

type StoresSectionProps = {
  stores: PublicStore[];
  /** Initial cards shown before “Load all” (default 9). */
  limit?: number;
  showViewAll?: boolean;
  hideIntro?: boolean;
};

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

export function StoresSection({
  stores,
  limit = INITIAL_VISIBLE,
  showViewAll = true,
  hideIntro = false,
}: StoresSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const count = stores.length;
  const hasMore = count > limit;
  const items = expanded || !hasMore ? stores : stores.slice(0, limit);

  return (
    <section
      id="stores"
      className={cn(
        "scroll-mt-28 bg-[var(--m-paper)]",
        hideIntro ? "pb-12 pt-8 sm:pb-14 sm:pt-10" : "m-section"
      )}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {!hideIntro && (
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
              Real salons on Beautora
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-4xl">
              Real salons. Running on Beautora.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[var(--m-muted)]">
              {count > 0
                ? "See how salons are using Beautora to manage their daily operations."
                : "Salons appear here as soon as they join Beautora. No demo listings."}
            </p>
          </div>
        )}

        {items.length === 0 ? (
          <p
            className={cn(
              "border-y border-[var(--m-line)] py-8 text-[var(--m-muted)]",
              hideIntro ? "mt-0" : "mt-8"
            )}
          >
            No stores yet.{" "}
            <Link href="/signup" className="underline-offset-4 hover:underline">
              Open your salon
            </Link>{" "}
            to be the first listed here.
          </p>
        ) : (
          <ul
            className={cn(
              "grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8",
              hideIntro ? "mt-0" : "mt-8"
            )}
          >
            {items.map((store) => (
              <li key={store.id}>
                <Link href={`/stores/${store.slug}`} className="group block">
                  <StoreCardMedia store={store} />
                  <div className="mt-5 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--m-muted)]">
                      {store.city?.trim() || `/${store.slug}`}
                    </p>
                    <h3 className="mt-1.5 font-display text-2xl font-medium text-[var(--m-ink)] transition-colors duration-150 group-hover:text-[var(--m-accent)]">
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
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold tracking-wide text-[var(--m-ink)] underline-offset-4 transition-transform duration-150 group-hover:translate-x-1 group-hover:underline motion-reduce:transform-none">
                      View store
                      <span aria-hidden>→</span>
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {showViewAll && hasMore && !expanded ? (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="m-btn m-btn-secondary min-w-[9rem]"
            >
              Load all
            </button>
          </div>
        ) : null}

        {showViewAll && expanded && count > limit ? (
          <div className="mt-8 flex justify-center">
            <Link href="/stores" className="m-btn m-btn-secondary">
              Browse store directory
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
