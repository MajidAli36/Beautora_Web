import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { SITE_SEO } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-studio-display",
  display: "swap",
});

const sans = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-studio-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${SYNCOPS.builder.name} · Studio behind ${SYNCOPS.name}`,
    template: `%s · ${SYNCOPS.builder.name}`,
  },
  description: `${SYNCOPS.builder.name} builds ${SYNCOPS.name} — salon POS, booking, and operations software. ${SITE_SEO.shortDescription}`,
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${display.variable} ${sans.variable} syncops-studio min-h-full antialiased`}
    >
      {children}
    </div>
  );
}
