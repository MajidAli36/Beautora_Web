import type { MetadataRoute } from "next";
import { SITE_SEO } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_SEO.product} by ${SITE_SEO.builder}`,
    short_name: SITE_SEO.product,
    description: SITE_SEO.shortDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#07090c",
    theme_color: "#0f172a",
    lang: "en-PK",
    categories: ["business", "productivity"],
    icons: [
      {
        src: SYNCOPS.ceo.photo,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
