import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BeautoraLogo } from "@/components/brand/beautora-logo";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { FaqSection } from "@/components/seo/faq-section";
import { LandingFinalCta } from "@/components/marketing/landing-final-cta";
import {
  getPublishedMarket,
  getPublishedMarketSlugs,
} from "@/lib/seo/content/markets";
import { buildPageMetadata } from "@/lib/seo/site";

type Props = { params: Promise<{ market: string }> };

export function generateStaticParams() {
  return getPublishedMarketSlugs().map((market) => ({ market }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { market } = await params;
  const page = getPublishedMarket(market);
  if (!page) return { robots: { index: false, follow: false } };
  return buildPageMetadata({
    title: page.title,
    description: page.description,
    path: `/salon-management-software/${page.slug}`,
    keywords: [`salon software ${page.slug}`, "salon management software"],
  });
}

export const revalidate = 3600;

export default async function SalonManagementMarketPage({ params }: Props) {
  const { market } = await params;
  const page = getPublishedMarket(market);
  if (!page) notFound();

  return (
    <div className="bg-[var(--m-paper)] pt-[var(--m-chrome)]">
      <div className="border-b border-[var(--m-line)] bg-[var(--m-mist)]">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "Salon management", path: "/salon-management-software" },
              { name: page.slug.replace(/-/g, " "), path: `/salon-management-software/${page.slug}` },
            ]}
          />
          <div className="mt-8 flex items-center gap-2.5">
            <BeautoraLogo size="sm" />
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
              Beautora
            </p>
          </div>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-5xl">
            {page.h1}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--m-muted)]">{page.lead}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex h-11 items-center bg-[var(--m-ink)] px-5 text-sm font-semibold text-white"
            >
              Start free trial
            </Link>
            <Link
              href="/salon-management-software"
              className="inline-flex h-11 items-center border border-[var(--m-line)] px-5 text-sm font-semibold text-[var(--m-ink)]"
            >
              Global overview
            </Link>
          </div>
        </div>
      </div>

      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="font-display text-3xl font-semibold text-[var(--m-ink)]">
            Local notes
          </h2>
          <ul className="mt-6 space-y-3 text-sm leading-relaxed text-[var(--m-muted)]">
            {page.localNotes.map((note) => (
              <li key={note} className="border-l-2 border-[var(--m-accent)] pl-4">
                {note}
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-[var(--m-ink-soft)]">
            Explore{" "}
            <Link href="/salon-booking-software" className="underline-offset-4 hover:underline">
              booking
            </Link>
            ,{" "}
            <Link href="/salon-pos" className="underline-offset-4 hover:underline">
              POS
            </Link>
            , and{" "}
            <Link href="/pricing" className="underline-offset-4 hover:underline">
              pricing
            </Link>
            .
          </p>
        </div>
      </section>

      <FaqSection path={`/salon-management-software/${page.slug}`} faqs={page.faqs} />
      <LandingFinalCta />
    </div>
  );
}
