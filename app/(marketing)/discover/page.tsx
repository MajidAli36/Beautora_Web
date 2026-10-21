import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { MarketplaceProductCard } from "@/components/marketplace/product-card";
import { MarketplaceQuickViewProvider } from "@/components/marketplace/product-quick-view";
import {
  listMarketplaceCategories,
  listPublicMarketplaceProducts,
} from "@/lib/marketplace/actions";
import { listPublicStores } from "@/lib/actions/stores";
import { buildPageMetadata } from "@/lib/seo/site";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Discover Beautora Marketplace",
  description:
    "Find salons to book and beauty products to buy on Beautora — services, sellers, and COD shop in one place.",
  path: "/discover",
  keywords: [
    "beautora marketplace",
    "discover salons",
    "beauty products",
    "book salon",
  ],
});

async function listApprovedSellers(limit = 8) {
  const admin = tryCreateAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("marketplace_sellers")
    .select("id, shop_name, slug, bio, logo_url, city, cover_url")
    .eq("status", "approved")
    .order("updated_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = Boolean(user);

  const [products, categories, stores, sellers] = await Promise.all([
    listPublicMarketplaceProducts({ q: query || undefined }),
    listMarketplaceCategories(),
    listPublicStores(),
    listApprovedSellers(),
  ]);

  const filteredStores = query
    ? stores.filter(
        (s) =>
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          (s.city ?? "").toLowerCase().includes(query.toLowerCase()) ||
          (s.tagline ?? "").toLowerCase().includes(query.toLowerCase())
      )
    : stores.slice(0, 8);

  const productSlice = products.slice(0, 8);

  return (
    <div className="m-under-chrome">
      <section className="relative overflow-hidden border-b border-[var(--m-line)] bg-[var(--m-ink)] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(900px_420px_at_15%_-10%,rgba(15,157,140,0.4),transparent_55%),radial-gradient(700px_380px_at_90%_80%,rgba(197,212,206,0.12),transparent_50%)]" />
        <div className="relative mx-auto max-w-6xl px-6 pt-6 pb-14 sm:pt-8 sm:pb-20">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "Discover", path: "/discover" },
            ]}
          />
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent-soft)]">
            Beautora Marketplace
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Book salons. Shop beauty.
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/70 sm:text-lg">
            One place to find salons for appointments and sellers for products — cash on
            delivery.
          </p>
          <form action="/discover" method="get" className="mt-8 flex max-w-xl gap-2">
            <input
              name="q"
              defaultValue={query}
              placeholder="Search salons, products, cities…"
              className="h-12 flex-1 border-0 bg-white/95 px-4 text-sm text-[var(--m-ink)] outline-none placeholder:text-[var(--m-muted)]"
            />
            <button
              type="submit"
              className="h-12 bg-[var(--m-accent)] px-6 text-sm font-semibold text-white transition-colors hover:bg-[var(--m-accent)]/90"
            >
              Search
            </button>
          </form>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/shop"
              className="inline-flex h-11 items-center bg-white px-5 text-sm font-semibold text-[var(--m-ink)]"
            >
              Browse products
            </Link>
            <Link
              href="/stores"
              className="inline-flex h-11 items-center border border-white/35 px-5 text-sm font-medium text-white hover:bg-white/10"
            >
              Find salons
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--m-line)] bg-[var(--m-mist)] py-8">
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-6">
          <Link
            href="/shop"
            className="shrink-0 border border-[var(--m-ink)] bg-[var(--m-ink)] px-3 py-1.5 text-xs font-semibold text-[var(--m-paper)]"
          >
            All products
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/shop?category=${c.slug}`}
              className="shrink-0 border border-[var(--m-line)] bg-[var(--m-paper)] px-3 py-1.5 text-xs font-semibold text-[var(--m-ink-soft)] hover:border-[var(--m-ink)]"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
              Products
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-[var(--m-ink)]">
              {query ? `Products matching “${query}”` : "Trending on the shop"}
            </h2>
          </div>
          <Link
            href={query ? `/shop?q=${encodeURIComponent(query)}` : "/shop"}
            className="text-sm font-medium text-[var(--m-accent)] underline-offset-4 hover:underline"
          >
            View all
          </Link>
        </div>
        {productSlice.length === 0 ? (
          <p className="mt-10 text-sm text-[var(--m-muted)]">No products found.</p>
        ) : (
          <MarketplaceQuickViewProvider isLoggedIn={isLoggedIn}>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {productSlice.map((p) => (
                <MarketplaceProductCard key={p.id} product={p} />
              ))}
            </div>
          </MarketplaceQuickViewProvider>
        )}
      </section>

      <section className="border-y border-[var(--m-line)] bg-[var(--m-mist)] py-14">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
                Sellers
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-[var(--m-ink)]">
                Marketplace shops
              </h2>
            </div>
            <Link
              href="/shop"
              className="text-sm font-medium text-[var(--m-accent)] underline-offset-4 hover:underline"
            >
              Shop products
            </Link>
          </div>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sellers.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/shop/seller/${s.slug}`}
                  className="block border border-[var(--m-line)] bg-[var(--m-paper)] p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center overflow-hidden bg-[var(--m-mist)] text-xs font-semibold">
                      {s.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.logo_url} alt="" className="size-full object-cover" />
                      ) : (
                        s.shop_name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--m-ink)]">{s.shop_name}</p>
                      <p className="truncate text-xs text-[var(--m-muted)]">
                        {s.city || "Beautora seller"}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
              Salons
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-[var(--m-ink)]">
              {query ? `Salons matching “${query}”` : "Book a chair"}
            </h2>
          </div>
          <Link
            href="/stores"
            className="text-sm font-medium text-[var(--m-accent)] underline-offset-4 hover:underline"
          >
            All stores
          </Link>
        </div>
        {filteredStores.length === 0 ? (
          <p className="mt-10 text-sm text-[var(--m-muted)]">No salons found.</p>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filteredStores.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/stores/${s.slug}`}
                  className="block border border-[var(--m-line)] bg-[var(--m-paper)] transition-shadow hover:shadow-md"
                >
                  <div className="aspect-[4/3] bg-[var(--m-mist)]">
                    {s.coverUrl || s.visual.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.coverUrl ?? s.visual.coverImage}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-[var(--m-ink)]">{s.name}</p>
                    <p className="mt-1 text-xs text-[var(--m-muted)]">
                      {s.city || s.tagline || "Salon"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
