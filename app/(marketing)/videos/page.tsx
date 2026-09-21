import type { Metadata } from "next";
import { VideosReelExperience } from "@/components/marketing/videos-reel-experience";
import { buildPageMetadata } from "@/lib/seo/site";
import { BEAUTORA_PRODUCTS } from "@/lib/marketing/products";
import { listMarketplaceVideoReels } from "@/lib/marketplace/video-reels";

export const revalidate = 60;

export const metadata: Metadata = buildPageMetadata({
  title: "Marketplace Videos — Product Reels",
  description: `Watch Beautora ${BEAUTORA_PRODUCTS.marketplace.name} product reels. Filter by country, city, and rating — TikTok-style shopping for beauty products.`,
  path: "/videos",
  keywords: [
    "Beautora Marketplace videos",
    "beauty product reels",
    "salon marketplace shop",
    "COD beauty products",
    "Marketplace product videos",
  ],
});

export default async function VideosPage() {
  const reels = await listMarketplaceVideoReels();

  return (
    <>
      <h1 className="sr-only">
        Beautora Marketplace videos — product reels by country, city, and rating
      </h1>
      <VideosReelExperience initialReels={reels} />
    </>
  );
}
