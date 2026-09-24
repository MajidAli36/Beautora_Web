import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { MarketplaceReel } from "@/lib/marketing/videos-reels";
import { MARKETPLACE_REELS } from "@/lib/marketing/videos-reels";
import {
  effectiveProductPrice,
  formatMarketplaceMoney,
} from "@/lib/marketplace/pricing";
import { currencyFromCountry } from "@/lib/currency/from-country";

/** Live seller reels (TikTok video) merged ahead of demo catalogue. */
export async function listMarketplaceVideoReels(): Promise<MarketplaceReel[]> {
  const admin = tryCreateAdminClient();
  if (!admin) return MARKETPLACE_REELS;

  try {
    const { data } = await admin
      .from("marketplace_products")
      .select(
        "id, title, short_description, description, price, sale_price, image_url, reel_video_url, marketplace_sellers!inner(shop_name, slug, city, country, status), marketplace_categories(name)"
      )
      .eq("status", "published")
      .eq("marketplace_sellers.status", "approved")
      .not("reel_video_url", "is", null)
      .order("updated_at", { ascending: false })
      .limit(40);

    const live: MarketplaceReel[] = (data ?? []).map((raw) => {
      const p = raw as unknown as {
        id: string;
        title: string;
        short_description: string | null;
        description: string | null;
        price: number;
        sale_price: number | null;
        image_url: string | null;
        reel_video_url: string | null;
        marketplace_sellers: {
          shop_name: string;
          slug: string;
          city: string | null;
          country: string | null;
        };
        marketplace_categories: { name: string } | null;
      };
      const seller = p.marketplace_sellers;
      const cat = p.marketplace_categories;
      const price = effectiveProductPrice({
        price: Number(p.price),
        sale_price: p.sale_price != null ? Number(p.sale_price) : null,
      });
      const currency = currencyFromCountry(seller.country).code;
      const money = formatMarketplaceMoney(price, currency);
      return {
        id: p.id,
        title: p.title,
        caption:
          p.short_description ||
          p.description ||
          `Shop ${p.title} on Beautora Marketplace.`,
        shopName: seller.shop_name,
        handle: seller.slug,
        priceLabel: money.replace(/^[^\d-]*/, "").trim() || money,
        currency,
        rating: 4.8,
        reviewCount: 0,
        country: seller.country || "Pakistan",
        countryCode: "PK",
        city: seller.city || "—",
        category: cat?.name || "Marketplace",
        durationLabel: "0:30",
        src: p.reel_video_url as string,
        poster:
          p.image_url ||
          "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80",
        href: `/product/${p.id}`,
        sound: `Original sound — ${seller.shop_name}`,
      };
    });

    return [...live, ...MARKETPLACE_REELS];
  } catch {
    return MARKETPLACE_REELS;
  }
}
