import { listPublicStores, listPublicStoreCities } from "@/lib/actions/stores";
import { StoresDirectory } from "@/components/marketing/stores-directory";
import { buildPageMetadata, cityToSlug } from "@/lib/seo/site";
import type { Metadata } from "next";
import Link from "next/link";

export const revalidate = 300;

export const metadata: Metadata = buildPageMetadata({
  title: "Stores",
  description:
    "Browse live salons on Beautora by SyncOps — search by name or city, view services, and book online.",
  path: "/stores",
  keywords: ["Beautora stores", "SyncOps salon directory", "book salon online Pakistan"],
});

export default async function StoresPage() {
  const [stores, cities] = await Promise.all([listPublicStores(), listPublicStoreCities()]);

  return (
    <div className="pt-[var(--m-chrome)]">
      <div className="border-b border-[var(--m-line)] bg-[var(--m-mist)]">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
            Directory
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-5xl lg:text-6xl">
            Stores
          </h1>
          <p className="mt-4 max-w-xl text-lg text-[var(--m-muted)]">
            Search live salons by name or city. Open a store for the full menu, team, and
            booking.
          </p>
          {cities.length > 0 ? (
            <div className="mt-8 flex flex-wrap gap-2">
              {cities.map((city) => (
                <Link
                  key={city}
                  href={`/stores/in/${cityToSlug(city)}`}
                  className="border border-[var(--m-line)] bg-white px-3 py-1.5 text-sm text-[var(--m-ink)] transition-colors hover:border-[var(--m-ink)]"
                >
                  {city}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <section className="bg-[var(--m-paper)] pt-10 pb-24 sm:pt-12 sm:pb-28">
        <div className="mx-auto max-w-6xl px-6">
          <StoresDirectory stores={stores} />
        </div>
      </section>
    </div>
  );
}
