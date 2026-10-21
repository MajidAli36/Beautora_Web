import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { MarketplaceCheckoutClient } from "@/components/marketplace/checkout-page-client";
import { buildPageMetadata } from "@/lib/seo/site";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Checkout · Beautora Marketplace",
  description: "Place a cash-on-delivery order on Beautora Marketplace.",
  path: "/checkout",
  noIndex: true,
});

export default async function CheckoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="m-under-chrome">
      <div className="border-b border-[var(--m-line)] bg-[var(--m-mist)]">
        <div className="mx-auto max-w-5xl px-6 pt-6 pb-10 sm:pt-8 sm:pb-12">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "Cart", path: "/cart" },
              { name: "Checkout", path: "/checkout" },
            ]}
          />
          <h1 className="mt-6 font-display text-4xl font-semibold text-[var(--m-ink)]">
            Checkout
          </h1>
          <p className="mt-2 text-[var(--m-muted)]">
            COD only at launch — no card capture at checkout.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <MarketplaceCheckoutClient
          isLoggedIn={Boolean(user)}
          defaultName={
            (user?.user_metadata?.full_name as string | undefined) ||
            user?.email?.split("@")[0] ||
            ""
          }
          defaultPhone={(user?.user_metadata?.phone as string | undefined) || ""}
          defaultEmail={user?.email ?? ""}
        />
      </div>
    </div>
  );
}
