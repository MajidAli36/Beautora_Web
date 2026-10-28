import Link from "next/link";
import { MarketplaceShop } from "@/components/marketplace/marketplace-shop";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { marketplaceBuyerSession } from "@/lib/auth/account-types";
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

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { isShopper, hasOtherAccountSession } = marketplaceBuyerSession(
    user
      ? { user_metadata: user.user_metadata as Record<string, unknown> }
      : null
  );
  const [products, categories] = await Promise.all([
    listPublicMarketplaceProducts({ q: q?.trim() || undefined, category }),
    listMarketplaceCategories(),
  ]);

  return (
    <div className="m-under-chrome">
      <div className="border-b border-[var(--m-line)] bg-[var(--m-mist)]">
        <div className="mx-auto max-w-6xl px-6 pt-6 pb-12 sm:pt-8 sm:pb-16">
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
            Discover products from Beautora sellers. Open a product for details, variants, and COD
            checkout.
          </p>
          <p className="mt-4 text-sm">
            <Link
              href="/discover"
              className="font-semibold text-[var(--m-accent)] underline-offset-4 hover:underline"
            >
              Discover salons &amp; shops
            </Link>
          </p>
          {!isShopper ? (
            <p className="mt-4 max-w-xl text-sm text-[var(--m-ink-soft)]">
              {hasOtherAccountSession ? (
                <>
                  You&apos;re signed in to a salon account. Buying here needs a{" "}
                  <span className="font-medium text-[var(--m-ink)]">shopper</span> account
                  (separate from POS / seller login).{" "}
                  <Link
                    href="/signup?as=customer"
                    className="font-semibold text-[var(--m-accent)] underline-offset-4 hover:underline"
                  >
                    Create a shopper account
                  </Link>
                  {" — use a different email, or sign out of the salon first."}
                </>
              ) : (
                <>
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
                    Sign in as shopper
                  </Link>
                  {" to add items to your cart."}
                </>
              )}
            </p>
          ) : null}
        </div>
      </div>
      <MarketplaceShop
        initialProducts={products}
        categories={categories}
        isLoggedIn={isShopper}
        hasOtherAccountSession={hasOtherAccountSession}
        initialQuery={q ?? ""}
        initialCategory={category ?? null}
      />
    </div>
  );
}
