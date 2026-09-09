import type { MetadataRoute } from "next";
import { SITE_SEO } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_SEO.product,
    short_name: SITE_SEO.product,
    description: SITE_SEO.shortDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#06211D",
    theme_color: "#06211D",
    lang: "en-PK",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
  };
}
