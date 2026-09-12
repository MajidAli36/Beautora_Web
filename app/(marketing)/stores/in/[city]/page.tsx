import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { listPublicStoresByCitySlug, listPublicStoreCities } from "@/lib/actions/stores";
import { StoresDirectory } from "@/components/marketing/stores-directory";
import { buildPageMetadata, cityToSlug, SITE_SEO } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";

export const revalidate = 600;

type CityPageProps = { params: Promise<{ city: string }> };

export async function generateStaticParams() {
  try {
    const cities = await listPublicStoreCities();
    return cities.map((city) => ({ city: cityToSlug(city) }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { city: citySlug } = await params;
  const result = await listPublicStoresByCitySlug(citySlug);
  if (!result) {
    return buildPageMetadata({
      title: "City not found",
      description: `No public salons found for this city on ${SYNCOPS.name}.`,
      path: `/stores/in/${citySlug}`,
      noIndex: true,
    });
  }
  const { cityLabel, stores } = result;
  return buildPageMetadata({
    title: `Salons in ${cityLabel}`,
    description: `Book salons in ${cityLabel} on ${SITE_SEO.product}. ${stores.length} live store${stores.length === 1 ? "" : "s"} with online booking — powered by ${SYNCOPS.builder.name}.`,
    path: `/stores/in/${citySlug}`,
    keywords: [
      `salon ${cityLabel}`,
      `book salon ${cityLabel}`,
      `beauty salon ${cityLabel}`,
      `${cityLabel} salon booking`,
    ],
  });
}

export default async function StoresInCityPage({ params }: CityPageProps) {
  const { city: citySlug } = await params;
  const result = await listPublicStoresByCitySlug(citySlug);
  if (!result) notFound();
  const { cityLabel, stores } = result;

  return (
    <div className="pt-[var(--m-chrome)]">
      <div className="border-b border-[var(--m-line)] bg-[var(--m-mist)]">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <Link
            href="/stores"
            className="text-sm font-medium text-[var(--m-muted)] transition-colors hover:text-[var(--m-ink)]"
          >
            ← All stores
          </Link>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
            {cityLabel}
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-5xl lg:text-6xl">
            Salons in {cityLabel}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-[var(--m-muted)]">
            Discover {stores.length} Beautora salon{stores.length === 1 ? "" : "s"} in{" "}
            {cityLabel}. Open a store to view services and book online.
          </p>
        </div>
      </div>

      <section className="bg-[var(--m-paper)] pt-10 pb-24 sm:pt-12 sm:pb-28">
        <div className="mx-auto max-w-6xl px-6">
          <Suspense fallback={<p className="text-sm text-[var(--m-muted)]">Loading stores…</p>}>
            <StoresDirectory stores={stores} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
