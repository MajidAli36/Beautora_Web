import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import { MarketingScrollManager } from "@/components/marketing/marketing-scroll-manager";
import { ScrollToTopButton } from "@/components/marketing/scroll-to-top-button";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { SITE_SEO } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";


const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-marketing-display",
  display: "swap",
});

const sans = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-marketing-sans",
  display: "swap",
});

/** Shared marketing chrome only — page-level metadata sets its own canonical. */
export const metadata: Metadata = {
  title: {
    default: SITE_SEO.titleDefault,
    template: SITE_SEO.titleTemplate,
  },
  description: SITE_SEO.description,
  keywords: [...SITE_SEO.keywords],
  authors: [
    { name: SYNCOPS.builder.name, url: SYNCOPS.builder.url },
    { name: SYNCOPS.ceo.name, url: "/ceo" },
  ],
  creator: SYNCOPS.builder.name,
  publisher: SYNCOPS.builder.name,
  openGraph: {
    type: "website",
    locale: SITE_SEO.locale,
    siteName: `${SITE_SEO.product} · ${SITE_SEO.builder}`,
    title: SITE_SEO.titleDefault,
    description: SITE_SEO.description,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_SEO.titleDefault,
    description: SITE_SEO.description,
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${display.variable} ${sans.variable} marketing-site flex min-h-full flex-col`}
    >
      <SiteHeader />
      <MarketingScrollManager />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <ScrollToTopButton />
    </div>
  );
}
