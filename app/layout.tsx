import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter, Geist_Mono } from "next/font/google";
import { SYNCOPS } from "@/lib/print/syncops";
import { SiteJsonLd } from "@/components/seo/site-json-ld";
import { AnalyticsScripts } from "@/components/seo/analytics";
import { AppToaster } from "@/components/ui/app-toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PartnerRefCapture } from "@/components/partners/partner-ref-capture";
import { buildRootMetadata, SITE_SEO } from "@/lib/seo/site";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = buildRootMetadata();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1117" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={SITE_SEO.htmlLang}
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <SiteJsonLd />
        <link rel="author" href={SYNCOPS.builder.url} title={SYNCOPS.builder.name} />
        <link rel="author" href={SYNCOPS.url} title={SYNCOPS.name} />
        <link rel="me" href={SYNCOPS.builder.url} />
        <link rel="me" href={SYNCOPS.url} />
      </head>
      <body className="flex min-h-full min-w-0 flex-col overflow-x-clip">
        <TooltipProvider>
          <Suspense fallback={null}>
            <PartnerRefCapture />
          </Suspense>
          {children}
          <AppToaster />
        </TooltipProvider>
        <AnalyticsScripts />
      </body>
    </html>
  );
}
