import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { MarketplaceCartPageClient } from "@/components/marketplace/cart-page-client";
import { buildPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Cart · Beautora Marketplace",
  description: "Review your Beautora Marketplace cart before COD checkout.",
  path: "/cart",
  noIndex: true,
});

export default function CartPage() {
  return (
    <div className="m-under-chrome">
      <div className="border-b border-[var(--m-line)] bg-[var(--m-mist)]">
        <div className="mx-auto max-w-3xl px-6 pt-6 pb-10 sm:pt-8 sm:pb-12">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "Shop", path: "/shop" },
              { name: "Cart", path: "/cart" },
            ]}
          />
          <h1 className="mt-6 font-display text-4xl font-semibold text-[var(--m-ink)]">
            Your cart
          </h1>
          <p className="mt-2 text-[var(--m-muted)]">Grouped by seller · Cash on delivery</p>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <MarketplaceCartPageClient />
      </div>
    </div>
  );
}
