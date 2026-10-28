import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { MarketplaceProductPdp } from "@/components/marketplace/product-pdp";
import { getProductCatalogByParam } from "@/lib/marketplace/catalog";
import {
  marketplaceProductPath,
  parseProductParam,
} from "@/lib/marketplace/product-url";
import { buildPageMetadata, absoluteUrl } from "@/lib/seo/site";
import { createClient } from "@/lib/supabase/server";
import { JsonLd } from "@/components/seo/json-ld";
import { effectiveProductPrice } from "@/lib/marketplace/pricing";
import { marketplaceBuyerSession } from "@/lib/auth/account-types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

type CatalogProduct = {
  id: string;
  slug: string;
  seller_id: string;
  title: string;
  price: number;
  sale_price: number | null;
  short_description: string | null;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
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

function asCatalogProduct(product: unknown): CatalogProduct {
  return product as CatalogProduct;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: param } = await params;
  const detail = await getProductCatalogByParam(param);
  if (!detail) {
    return buildPageMetadata({
      title: "Product not found",
      description: "This marketplace product is unavailable.",
      path: `/product/${param}`,
      noIndex: true,
    });
  }
  const p = asCatalogProduct(detail.product);
  const path = marketplaceProductPath(p);
  const description =
    p.seo_description ||
    p.short_description ||
    p.description ||
    `Buy ${p.title} on Beautora Marketplace — cash on delivery from verified beauty sellers.`;

  return buildPageMetadata({
    title: p.seo_title || p.title,
    description,
    path,
    image: p.image_url,
    keywords: [
      p.title,
      "beautora marketplace",
      "beauty products",
      "COD",
      "salon products online",
    ],
  });
}

export default async function ProductDetailPage({ params }: Props) {
  const { id: param } = await params;
  const detail = await getProductCatalogByParam(param);
  if (!detail) notFound();

  const product = asCatalogProduct(detail.product);

  const canonicalPath = marketplaceProductPath(product);
  const parsed = parseProductParam(param);
  // Permanent redirect UUID / bare-slug / mistyped-slug URLs to the SEO canonical.
  if (parsed.kind === "uuid" || parsed.kind === "slug") {
    permanentRedirect(canonicalPath);
  }
  if (`/product/${param}` !== canonicalPath) {
    permanentRedirect(canonicalPath);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { isShopper, hasOtherAccountSession } = marketplaceBuyerSession(
    user
      ? { user_metadata: user.user_metadata as Record<string, unknown> }
      : null
  );

  const price = effectiveProductPrice(product);
  const { currencyFromCountry } = await import("@/lib/currency/from-country");
  const currency = currencyFromCountry(product.marketplace_sellers.country).code;
  const absoluteProductUrl = absoluteUrl(canonicalPath);
  const description =
    product.seo_description ||
    product.short_description ||
    product.description ||
    undefined;

  return (
    <div className="m-under-chrome">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.seo_title || product.title,
          description,
          image: product.image_url
            ? [
                product.image_url.startsWith("http")
                  ? product.image_url
                  : absoluteUrl(product.image_url),
              ]
            : undefined,
          url: absoluteProductUrl,
          sku: product.id,
          brand: product.marketplace_brands?.name
            ? { "@type": "Brand", name: product.marketplace_brands.name }
            : { "@type": "Brand", name: product.marketplace_sellers.shop_name },
          offers: {
            "@type": "Offer",
            url: absoluteProductUrl,
            priceCurrency: currency,
            price: price,
            availability:
              product.stock > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            seller: {
              "@type": "Organization",
              name: product.marketplace_sellers.shop_name,
            },
          },
        }}
      />
      <div className="border-b border-[var(--m-line)] bg-[var(--m-mist)]">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "Shop", path: "/shop" },
              { name: product.title, path: canonicalPath },
            ]}
          />
        </div>
      </div>
      <MarketplaceProductPdp
        product={detail.product as never}
        seller={product.marketplace_sellers}
        categoryName={product.marketplace_categories?.name ?? null}
        brandName={product.marketplace_brands?.name ?? null}
        images={detail.images as never}
        variants={detail.variants as never}
        reviews={detail.reviews as never}
        isLoggedIn={isShopper}
        hasOtherAccountSession={hasOtherAccountSession}
        currency={currency}
      />
      <p className="sr-only">Price {price}</p>
      <div className="mx-auto max-w-6xl px-6 pb-16">
        <Link
          href={`/shop/seller/${product.marketplace_sellers.slug}`}
          className="text-sm font-medium text-[var(--m-accent)] underline-offset-4 hover:underline"
        >
          More from {product.marketplace_sellers.shop_name} →
        </Link>
      </div>
    </div>
  );
}
