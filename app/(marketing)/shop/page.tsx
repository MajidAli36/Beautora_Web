import Link from "next/link";
import { MarketplaceShop } from "@/components/marketplace/marketplace-shop";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import {
  listMarketplaceCategories,
  listPublicMarketplaceProducts,
} from "@/lib/marketplace/actions";
import { buildPageMetadata } from "@/lib/seo/site";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Beautora Marketplace Shop",
  description:
    "Shop beauty products from salon sellers on Beautora Marketplace — sign in to add to cart, cash on delivery. Separate from salon booking and POS.",
  path: "/shop",
  keywords: [
    "beautora marketplace",
    "salon marketplace",
    "buy beauty products",
    "salon retail COD",
  ],
});

export default async function ShopPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [products, categories] = await Promise.all([
    listPublicMarketplaceProducts(),
    listMarketplaceCategories(),
  ]);

  return (
    <div className="pt-[var(--m-chrome)]">
      <div className="border-b border-[var(--m-line)] bg-[var(--m-mist)]">
        <div className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "Shop", path: "/shop" },
            ]}
          />
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
            Marketplace
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-5xl">
            Marketplace Shop
          </h1>
          <p className="mt-3 max-w-xl text-base text-[var(--m-muted)]">
            Discover products from Beautora sellers. Sign in as a shopper to add to cart and place
            COD orders.
          </p>
          {!user ? (
            <p className="mt-4 text-sm text-[var(--m-ink-soft)]">
              <Link
                href="/signup?as=customer"
                className="font-semibold text-[var(--m-accent)] underline-offset-4 hover:underline"
              >
                Create a shopper account
              </Link>
              {" · "}
              <Link
                href="/login?redirect=%2Fshop"
                className="font-semibold text-[var(--m-accent)] underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
              {" to add items to your cart."}
            </p>
          ) : (
            <p className="mt-4 text-sm text-[var(--m-muted)]">
              Signed in as {user.email} — you can add products to your cart.
            </p>
          )}
        </div>
      </div>
      <MarketplaceShop
        initialProducts={products}
        categories={categories}
        isLoggedIn={Boolean(user)}
      />
    </div>
  );
}
