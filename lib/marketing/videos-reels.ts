import { SYNCOPS } from "@/lib/print/syncops";

/** Marketplace product reels for /videos — location + rating aware. */

export type MarketplaceReel = {
  id: string;
  title: string;
  caption: string;
  shopName: string;
  handle: string;
  priceLabel: string;
  currency: string;
  rating: number;
  reviewCount: number;
  country: string;
  countryCode: string;
  city: string;
  category: string;
  durationLabel: string;
  src: string;
  poster: string;
  href: string;
  sound: string;
};

const SAMPLE = {
  a: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  b: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  c: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  d: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  e: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
  f: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
  g: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  h: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  i: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  j: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  k: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  l: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
} as const;

/** Demo Marketplace catalogue — beauty retail across markets. */
export const MARKETPLACE_REELS: MarketplaceReel[] = [
  {
    id: "serum-lahore",
    title: "Keratin repair serum",
    caption: "Salon-grade keratin serum · COD available on Beautora Marketplace.",
    shopName: "Glow Desk Lahore",
    handle: "glowdesk",
    priceLabel: "2,450",
    currency: "Rs",
    rating: 4.9,
    reviewCount: 128,
    country: "Pakistan",
    countryCode: "PK",
    city: "Lahore",
    category: "Hair care",
    durationLabel: "0:15",
    src: SAMPLE.a,
    poster:
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80",
    href: "/shop",
    sound: "Original sound — Glow Desk",
  },
  {
    id: "shampoo-karachi",
    title: "Argan oil shampoo kit",
    caption: "Sulfate-free duo for color-treated hair · ships COD across Pakistan.",
    shopName: "Coastal Beauty",
    handle: "coastalbeauty",
    priceLabel: "3,200",
    currency: "Rs",
    rating: 4.7,
    reviewCount: 86,
    country: "Pakistan",
    countryCode: "PK",
    city: "Karachi",
    category: "Hair care",
    durationLabel: "0:15",
    src: SAMPLE.b,
    poster:
      "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?auto=format&fit=crop&w=900&q=80",
    href: "/shop",
    sound: "Original sound — Coastal Beauty",
  },
  {
    id: "mask-islamabad",
    title: "Clay detox face mask",
    caption: "Weekly reset mask for oily & combination skin · Marketplace exclusive pack.",
    shopName: "Capitol Glow",
    handle: "capitolglow",
    priceLabel: "1,890",
    currency: "Rs",
    rating: 4.5,
    reviewCount: 54,
    country: "Pakistan",
    countryCode: "PK",
    city: "Islamabad",
    category: "Skincare",
    durationLabel: "0:14",
    src: SAMPLE.c,
    poster:
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=80",
    href: "/shop",
    sound: "Original sound — Capitol Glow",
  },
  {
    id: "lipstick-nyc",
    title: "Velvet matte lipstick",
    caption: "Long-wear matte in 8 shades · US Marketplace sellers, COD where offered.",
    shopName: "Studio Rouge",
    handle: "studiorouge",
    priceLabel: "28",
    currency: "$",
    rating: 4.8,
    reviewCount: 210,
    country: "United States",
    countryCode: "US",
    city: "New York",
    category: "Makeup",
    durationLabel: "0:15",
    src: SAMPLE.d,
    poster:
      "https://images.unsplash.com/photo-1586495777744-4413f2109046?auto=format&fit=crop&w=900&q=80",
    href: "/shop",
    sound: "Original sound — Studio Rouge",
  },
  {
    id: "brush-la",
    title: "Pro brush set (12pc)",
    caption: "Soft synthetic brushes for face & eye · rated top seller in California.",
    shopName: "West Coast Tools",
    handle: "wctools",
    priceLabel: "64",
    currency: "$",
    rating: 4.6,
    reviewCount: 97,
    country: "United States",
    countryCode: "US",
    city: "Los Angeles",
    category: "Tools",
    durationLabel: "0:15",
    src: SAMPLE.e,
    poster:
      "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=900&q=80",
    href: "/shop",
    sound: "Original sound — West Coast Tools",
  },
  {
    id: "perfume-london",
    title: "Citrus hair perfume mist",
    caption: "Light fragrance mist for between washes · UK Marketplace COD partners.",
    shopName: "Borough Scents",
    handle: "boroughscents",
    priceLabel: "22",
    currency: "£",
    rating: 4.4,
    reviewCount: 41,
    country: "United Kingdom",
    countryCode: "GB",
    city: "London",
    category: "Fragrance",
    durationLabel: "0:15",
    src: SAMPLE.f,
    poster:
      "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=900&q=80",
    href: "/shop",
    sound: "Original sound — Borough Scents",
  },
  {
    id: "oil-manchester",
    title: "Cold-pressed argan oil",
    caption: "100% pure finishing oil · small-batch UK seller on Beautora Marketplace.",
    shopName: "Northern Botanics",
    handle: "nbotanics",
    priceLabel: "18",
    currency: "£",
    rating: 4.9,
    reviewCount: 173,
    country: "United Kingdom",
    countryCode: "GB",
    city: "Manchester",
    category: "Hair care",
    durationLabel: "0:15",
    src: SAMPLE.g,
    poster:
      "https://images.unsplash.com/photo-1608248547993-df8117702ac1?auto=format&fit=crop&w=900&q=80",
    href: "/shop",
    sound: "Original sound — Northern Botanics",
  },
  {
    id: "serum-dubai",
    title: "Vitamin C bright serum",
    caption: "Glass-skin serum for humid climates · Dubai sellers, COD checkout.",
    shopName: "Marina Glow Lab",
    handle: "marinaglow",
    priceLabel: "95",
    currency: "AED",
    rating: 4.8,
    reviewCount: 142,
    country: "United Arab Emirates",
    countryCode: "AE",
    city: "Dubai",
    category: "Skincare",
    durationLabel: "0:15",
    src: SAMPLE.h,
    poster:
      "https://images.unsplash.com/photo-1620916560345-c4f21d4c0f0a?auto=format&fit=crop&w=900&q=80",
    href: "/shop",
    sound: "Original sound — Marina Glow",
  },
  {
    id: "kit-abu-dhabi",
    title: "Bridal glow kit",
    caption: "Primer · highlighter · setting spray · curated for UAE bridal floors.",
    shopName: "Desert Rose Beauty",
    handle: "desertrose",
    priceLabel: "180",
    currency: "AED",
    rating: 5.0,
    reviewCount: 64,
    country: "United Arab Emirates",
    countryCode: "AE",
    city: "Abu Dhabi",
    category: "Kits",
    durationLabel: "0:14",
    src: SAMPLE.i,
    poster:
      "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=900&q=80",
    href: "/shop",
    sound: "Original sound — Desert Rose",
  },
  {
    id: "henna-mumbai",
    title: "Organic henna cones",
    caption: "Fresh-ground henna for bridal art · India Marketplace sellers.",
    shopName: "Mehndi House",
    handle: "mehndihouse",
    priceLabel: "499",
    currency: "₹",
    rating: 4.3,
    reviewCount: 39,
    country: "India",
    countryCode: "IN",
    city: "Mumbai",
    category: "Body art",
    durationLabel: "0:15",
    src: SAMPLE.j,
    poster:
      "https://images.unsplash.com/photo-1607779097040-26be85726502?auto=format&fit=crop&w=900&q=80",
    href: "/shop",
    sound: "Original sound — Mehndi House",
  },
  {
    id: "toner-toronto",
    title: "Rose water toner",
    caption: "Alcohol-free toner for sensitive skin · Canada Marketplace COD where available.",
    shopName: "Maple Skin Co",
    handle: "mapleskin",
    priceLabel: "19",
    currency: "C$",
    rating: 4.2,
    reviewCount: 28,
    country: "Canada",
    countryCode: "CA",
    city: "Toronto",
    category: "Skincare",
    durationLabel: "0:15",
    src: SAMPLE.k,
    poster:
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=80",
    href: "/shop",
    sound: "Original sound — Maple Skin",
  },
  {
    id: "nail-sydney",
    title: "Gel polish starter kit",
    caption: "Salon colors + base/top · Australia Marketplace product reel.",
    shopName: "Harbour Nails",
    handle: "harbournails",
    priceLabel: "49",
    currency: "A$",
    rating: 4.7,
    reviewCount: 77,
    country: "Australia",
    countryCode: "AU",
    city: "Sydney",
    category: "Nails",
    durationLabel: "0:15",
    src: SAMPLE.l,
    poster:
      "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80",
    href: "/shop",
    sound: "Original sound — Harbour Nails",
  },
];

export type MarketplaceReelFilters = {
  country: string | "all";
  city: string | "all";
  minRating: 0 | 3 | 4 | 4.5;
  sort: "rating" | "newest";
  q: string;
};

export const DEFAULT_MARKETPLACE_REEL_FILTERS: MarketplaceReelFilters = {
  country: "all",
  city: "all",
  minRating: 0,
  sort: "rating",
  q: "",
};

export function countryFlag(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  if (code.length !== 2) return "🌐";
  return String.fromCodePoint(...[...code].map((c) => 127397 + c.charCodeAt(0)));
}

export function listReelCountries(reels: MarketplaceReel[] = MARKETPLACE_REELS) {
  const map = new Map<string, { country: string; countryCode: string; count: number }>();
  for (const r of reels) {
    const cur = map.get(r.country);
    if (cur) cur.count += 1;
    else map.set(r.country, { country: r.country, countryCode: r.countryCode, count: 1 });
  }
  return [...map.values()].sort((a, b) => a.country.localeCompare(b.country));
}

export function listReelCities(
  country: string | "all",
  reels: MarketplaceReel[] = MARKETPLACE_REELS
) {
  const scoped = country === "all" ? reels : reels.filter((r) => r.country === country);
  const map = new Map<string, number>();
  for (const r of scoped) map.set(r.city, (map.get(r.city) ?? 0) + 1);
  return [...map.entries()]
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => a.city.localeCompare(b.city));
}

export function filterMarketplaceReels(
  filters: MarketplaceReelFilters,
  reels: MarketplaceReel[] = MARKETPLACE_REELS
): MarketplaceReel[] {
  const q = filters.q.trim().toLowerCase();
  let next = reels.filter((r) => {
    if (filters.country !== "all" && r.country !== filters.country) return false;
    if (filters.city !== "all" && r.city !== filters.city) return false;
    if (r.rating < filters.minRating) return false;
    if (!q) return true;
    return (
      r.title.toLowerCase().includes(q) ||
      r.shopName.toLowerCase().includes(q) ||
      r.caption.toLowerCase().includes(q) ||
      r.city.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q)
    );
  });

  if (filters.sort === "rating") {
    next = [...next].sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
  }

  return next;
}

export const MARKETPLACE_REEL_META = {
  title: "Marketplace Videos",
  eyebrow: SYNCOPS.name,
  subtitle: "Product reels from Beautora Marketplace — filter by country, city, and rating.",
} as const;
