import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/onboarding",
          "/billing",
          "/platform",
          "/partner/dashboard",
          "/login",
          "/reset-password",
          "/api/",
          "/pos",
          "/sales",
          "/customers",
          "/appointments",
          "/staff",
          "/attendance",
          "/devices",
          "/reports",
          "/finances",
          "/settings",
          "/whatsapp",
          "/feedback",
          "/queue",
          "/products",
          "/services",
          "/chairs",
          "/online-booking",
          "/in-house",
          "/kiosk/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl.replace(/^https?:\/\//, ""),
  };
}
