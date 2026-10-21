import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { MarketplaceProductCard } from "@/components/marketplace/product-card";
import { MarketplaceQuickViewProvider } from "@/components/marketplace/product-quick-view";
import { getPublicSellerStore } from "@/lib/marketplace/buyer";
import {
  listPublicMarketplaceProducts,
  type PublicProductCard,
} from "@/lib/marketplace/actions";
import { buildPageMetadata } from "@/lib/seo/site";
import { trackMarketplaceEvent } from "@/lib/marketplace/analytics";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const store = await getPublicSellerStore(slug);
  if (!store) {
    return buildPageMetadata({
      title: "Seller not found",
      description: "This marketplace seller is unavailable.",
      path: `/shop/seller/${slug}`,
      noIndex: true,
    });
  }
  return buildPageMetadata({
    title: store.seller.shop_name,
    description:
      store.seller.bio ||
      `Shop ${store.seller.shop_name} on Beautora Marketplace — cash on delivery.`,
    path: `/shop/seller/${slug}`,
    image: store.seller.cover_url || store.seller.logo_url,
    keywords: [store.seller.shop_name, "beautora marketplace", "seller"],
  });
}

export default async function SellerStorePage({ params }: Props) {
  const { slug } = await params;
  const store = await getPublicSellerStore(slug);
  if (!store) notFound();

  void trackMarketplaceEvent({
    eventType: "store_view",
    sellerId: store.seller.id,
  });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = Boolean(user);

  const all = await listPublicMarketplaceProducts();
  const cards: PublicProductCard[] = all.filter((p) => p.seller_id === store.seller.id);

  return (
    <div className="m-under-chrome">
      <section className="relative min-h-[42vh] overflow-hidden bg-[var(--m-ink)] text-white">
        {store.seller.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={store.seller.cover_url}
            alt=""
            className="absolute inset-0 size-full object-cover opacity-50"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(15,157,140,0.35),transparent_55%)]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(12,31,28,0.85),rgba(12,31,28,0.35))]" />
        <div className="relative mx-auto flex min-h-[42vh] max-w-6xl flex-col justify-end px-6 pb-12 pt-12">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "Shop", path: "/shop" },
              { name: store.seller.shop_name, path: `/shop/seller/${slug}` },
            ]}
          />
          <div className="mt-8 flex flex-wrap items-end gap-4">
            <div className="flex size-16 items-center justify-center overflow-hidden bg-white/10 text-lg font-semibold ring-1 ring-white/25">
              {store.seller.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={store.seller.logo_url} alt="" className="size-full object-cover" />
              ) : (
                store.seller.shop_name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent-soft)]">
                Marketplace seller
                {store.seller.city ? ` · ${store.seller.city}` : ""}
              </p>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                {store.seller.shop_name}
              </h1>
              {store.seller.bio ? (
                <p className="mt-3 max-w-xl text-base text-white/75">{store.seller.bio}</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
              Catalog
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-[var(--m-ink)]">
              Products
            </h2>
          </div>
          <Link
            href="/shop"
            className="text-sm font-medium text-[var(--m-accent)] underline-offset-4 hover:underline"
          >
            Browse all shops
          </Link>
        </div>

        {cards.length === 0 ? (
          <p className="mt-12 py-10 text-center text-sm text-[var(--m-muted)]">
            No published products yet.
          </p>
        ) : (
          <MarketplaceQuickViewProvider isLoggedIn={isLoggedIn}>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {cards.map((p) => (
                <MarketplaceProductCard key={p.id} product={p} />
              ))}
            </div>
          </MarketplaceQuickViewProvider>
        )}
      </section>
    </div>
  );
}
