import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
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
  description: `${SYNCOPS.builder.name} builds ${SYNCOPS.name} — salon POS, booking, and operations software. Official site ${SYNCOPS.builder.domain}. Founded by ${SYNCOPS.ceo.name}.`,
  authors: [
    { name: SYNCOPS.builder.name, url: SYNCOPS.builder.url },
    { name: SYNCOPS.ceo.name, url: "/ceo" },
  ],
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
