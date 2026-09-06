import Link from "next/link";
import type { PublicStore } from "@/lib/actions/stores";
import { StoreCardMedia } from "@/components/marketing/store-card-media";
import { cn } from "@/lib/utils";

type StoresSectionProps = {
  stores: PublicStore[];
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
  limit,
  showViewAll = true,
  hideIntro = false,
}: StoresSectionProps) {
  const items = typeof limit === "number" ? stores.slice(0, limit) : stores;
  const count = stores.length;

  return (
    <section
      id="stores"
      className={cn(
        "scroll-mt-24 bg-[var(--m-paper)]",
        hideIntro ? "pt-12 pb-24 sm:pt-14 sm:pb-28" : "py-24 sm:py-28"
      )}
    >
      <div className="mx-auto max-w-6xl px-6">
        {!hideIntro && (
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
              Live stores
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-5xl">
              Real salons on Beautora
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-[var(--m-muted)]">
              {count > 0
                ? `${count} salon${count === 1 ? "" : "s"} from our database — open a store to see live services and book.`
                : "Salons appear here as soon as they join Beautora. No demo listings."}
            </p>
          </div>
        )}

        {items.length === 0 ? (
          <p
            className={cn(
              "border-y border-[var(--m-line)] py-10 text-[var(--m-muted)]",
              hideIntro ? "mt-0" : "mt-14"
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
              "grid gap-10 sm:grid-cols-2 lg:grid-cols-3",
              hideIntro ? "mt-0" : "mt-14"
            )}
          >
            {items.map((store) => (
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

        {showViewAll && count > (limit ?? count) && (
          <div className="mt-12">
            <Link
              href="/stores"
              className="inline-flex h-11 items-center border border-[var(--m-ink)] px-6 text-sm font-semibold tracking-wide text-[var(--m-ink)] transition-colors hover:bg-[var(--m-ink)] hover:text-[var(--m-paper)]"
            >
              View all stores
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
