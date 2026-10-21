import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { NoShowCalculator } from "@/components/seo/tools/no-show-calculator";
import { buildPageMetadata } from "@/lib/seo/site";

export const revalidate = 3600;

export const metadata: Metadata = buildPageMetadata({
  title: "Salon No-Show Calculator",
  description:
    "Free salon no-show calculator — estimate monthly revenue lost to empty chairs, then tighten booking with Beautora.",
  path: "/tools/salon-no-show-calculator",
  keywords: ["salon no-show calculator", "appointment no-show cost"],
});

export default function NoShowCalculatorPage() {
  return (
    <div className="bg-[var(--m-paper)] m-under-chrome">
      <div className="border-b border-[var(--m-line)] bg-[var(--m-mist)]">
        <div className="mx-auto max-w-3xl px-6 pt-6 pb-14 sm:pt-8 sm:pb-16">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "Tools", path: "/tools" },
              { name: "No-show calculator", path: "/tools/salon-no-show-calculator" },
            ]}
          />
          <h1 className="mt-8 font-display text-4xl font-semibold text-[var(--m-ink)]">
            Salon no-show calculator
          </h1>
          <p className="mt-4 text-lg text-[var(--m-muted)]">
            Multiply weekly no-shows by average ticket and weeks in the month to see revenue at risk.
            This is a planning estimate — not accounting advice.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-6 py-14">
        <NoShowCalculator />
      </div>
    </div>
  );
}
