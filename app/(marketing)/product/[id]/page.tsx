import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { MarketplaceProductPdp } from "@/components/marketplace/product-pdp";
import { getProductCatalogDetail } from "@/lib/marketplace/catalog";
import { buildPageMetadata } from "@/lib/seo/site";
import { createClient } from "@/lib/supabase/server";
import { JsonLd } from "@/components/seo/json-ld";
import { effectiveProductPrice } from "@/lib/marketplace/pricing";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const detail = await getProductCatalogDetail(id);
  if (!detail) {
    return buildPageMetadata({
      title: "Product not found",
      description: "This marketplace product is unavailable.",
      path: `/product/${id}`,
      noIndex: true,
    });
  }
  const p = detail.product as {
    title: string;
    short_description: string | null;
    description: string | null;
    seo_title: string | null;
    seo_description: string | null;
    image_url: string | null;
    price: number;
    sale_price: number | null;
  };
  return buildPageMetadata({
    title: p.seo_title || p.title,
    description:
      p.seo_description ||
      p.short_description ||
      p.description ||
      `Buy ${p.title} on Beautora Marketplace — cash on delivery.`,
    path: `/product/${id}`,
    image: p.image_url,
    keywords: [p.title, "beautora marketplace", "COD"],
  });
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const detail = await getProductCatalogDetail(id);
  if (!detail) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const raw = detail.product as unknown as {
    id: string;
    seller_id: string;
    title: string;
    price: number;
    sale_price: number | null;
    short_description: string | null;
    description: string | null;
    image_url: string | null;
    stock: number;
    marketplace_sellers: {
      shop_name: string;
      slug: string;
      logo_url: string | null;
      city: string | null;
      country: string | null;
    };
    marketplace_categories: { name: string; slug: string } | null;
    marketplace_brands: { name: string; slug: string } | null;
  };

  const price = effectiveProductPrice(raw);
  const { currencyFromCountry } = await import("@/lib/currency/from-country");
  const currency = currencyFromCountry(raw.marketplace_sellers.country).code;

  return (
    <div className="m-under-chrome">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: raw.title,
          description: raw.short_description || raw.description || undefined,
          image: raw.image_url || undefined,
          brand: raw.marketplace_brands?.name
            ? { "@type": "Brand", name: raw.marketplace_brands.name }
            : undefined,
          offers: {
            "@type": "Offer",
            priceCurrency: currency,
            price: price,
            availability:
              raw.stock > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            url: `/product/${id}`,
          },
        }}
      />
      <div className="border-b border-[var(--m-line)] bg-[var(--m-mist)]">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "Shop", path: "/shop" },
              { name: raw.title, path: `/product/${id}` },
            ]}
          />
        </div>
      </div>
      <MarketplaceProductPdp
        product={detail.product as never}
        seller={raw.marketplace_sellers}
        categoryName={raw.marketplace_categories?.name ?? null}
        brandName={raw.marketplace_brands?.name ?? null}
        images={detail.images as never}
        variants={detail.variants as never}
        reviews={detail.reviews as never}
        isLoggedIn={Boolean(user)}
        currency={currency}
      />
      <p className="sr-only">Price {price}</p>
      <div className="mx-auto max-w-6xl px-6 pb-16">
        <Link
          href={`/shop/seller/${raw.marketplace_sellers.slug}`}
          className="text-sm font-medium text-[var(--m-accent)] underline-offset-4 hover:underline"
        >
          More from {raw.marketplace_sellers.shop_name} →
        </Link>
      </div>
    </div>
  );
}
