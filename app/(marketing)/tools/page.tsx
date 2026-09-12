import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { buildPageMetadata } from "@/lib/seo/site";

export const revalidate = 3600;

export const metadata: Metadata = buildPageMetadata({
  title: "Free Salon Calculators",
  description:
    "Free salon calculators from Beautora — no-show cost and commission planning tools for beauty-business owners.",
  path: "/tools",
  keywords: ["salon calculator", "salon no-show calculator", "salon commission calculator"],
});

const TOOLS = [
  {
    href: "/tools/salon-no-show-calculator",
    title: "Salon no-show calculator",
    body: "Estimate monthly revenue at risk from empty chairs.",
  },
  {
    href: "/tools/salon-commission-calculator",
    title: "Salon commission calculator",
    body: "Plan stylist payouts from revenue, rate, and deductions.",
  },
] as const;

export default function ToolsIndexPage() {
  return (
    <div className="bg-[var(--m-paper)] pt-[var(--m-chrome)]">
      <div className="border-b border-[var(--m-line)] bg-[var(--m-mist)]">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Tools", path: "/tools" }]} />
          <h1 className="mt-8 font-display text-4xl font-semibold text-[var(--m-ink)] sm:text-5xl">
            Free salon calculators
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--m-muted)]">
            Real tools — not empty landing pages. Use them, then explore Beautora when you are ready.
          </p>
        </div>
      </div>
      <section className="py-16">
        <div className="mx-auto grid max-w-6xl gap-4 px-6 sm:grid-cols-2">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="border border-[var(--m-line)] bg-white p-6 transition-colors hover:border-[var(--m-ink)]"
            >
              <h2 className="font-display text-2xl font-semibold text-[var(--m-ink)]">{tool.title}</h2>
              <p className="mt-2 text-sm text-[var(--m-muted)]">{tool.body}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
