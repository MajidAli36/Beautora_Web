import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { CommissionCalculator } from "@/components/seo/tools/commission-calculator";
import { buildPageMetadata } from "@/lib/seo/site";

export const revalidate = 3600;

export const metadata: Metadata = buildPageMetadata({
  title: "Salon Commission Calculator",
  description:
    "Free salon commission calculator — estimate stylist payouts from revenue, commission rate, and deductions.",
  path: "/tools/salon-commission-calculator",
  keywords: ["salon commission calculator", "stylist commission calculator"],
});

export default function CommissionCalculatorPage() {
  return (
    <div className="bg-[var(--m-paper)] pt-[var(--m-chrome)]">
      <div className="border-b border-[var(--m-line)] bg-[var(--m-mist)]">
        <div className="mx-auto max-w-3xl px-6 py-14">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "Tools", path: "/tools" },
              { name: "Commission calculator", path: "/tools/salon-commission-calculator" },
            ]}
          />
          <h1 className="mt-8 font-display text-4xl font-semibold text-[var(--m-ink)]">
            Salon commission calculator
          </h1>
          <p className="mt-4 text-lg text-[var(--m-muted)]">
            Model a simple revenue × rate − deductions payout. Adjust to your salon&apos;s policy.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-6 py-14">
        <CommissionCalculator />
      </div>
    </div>
  );
}
