import { Cormorant_Garamond, Outfit } from "next/font/google";
import { ScrollToTopButton } from "@/components/marketing/scroll-to-top-button";

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

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${display.variable} ${sans.variable} marketing-site auth-root flex min-h-full flex-1 flex-col`}
    >
      {children}
      <ScrollToTopButton threshold={120} />
    </div>
  );
}
