import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicStoreBookingProfile } from "@/lib/actions/store-profile";
import { getPublicStoreBySlug } from "@/lib/actions/stores";
import { MarketingBookingPage } from "@/components/marketing/marketing-booking-page";
import { JsonLd } from "@/components/seo/json-ld";
import { buildLocalBusinessJsonLd } from "@/lib/seo/local-business";
import { buildPageMetadata } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";

export const revalidate = 120;

type BookPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: BookPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [org, store] = await Promise.all([
    getPublicStoreBookingProfile(slug),
    getPublicStoreBySlug(slug),
  ]);
  if (!org) {
    return buildPageMetadata({
      title: "Book appointment",
      description: `Online salon booking by ${SYNCOPS.name}.`,
      path: `/book/${slug}`,
      noIndex: true,
    });
  }
  const cityBit = org.city?.trim() ? ` in ${org.city.trim()}` : "";
  return buildPageMetadata({
    title: `Book at ${org.name}`,
    description: `Book online at ${org.name}${cityBit}. Powered by ${SYNCOPS.name} by ${SYNCOPS.builder.name}.`,
    path: `/book/${slug}`,
    keywords: [org.name, org.city?.trim() || "", "book salon online"].filter(Boolean),
    image: store?.coverUrl ?? store?.visual.coverImage ?? null,
  });
}

export default async function BookSlugPage({ params }: BookPageProps) {
  const { slug } = await params;
  const [org, store] = await Promise.all([
    getPublicStoreBookingProfile(slug),
    getPublicStoreBySlug(slug),
  ]);
  if (!org) notFound();

  const schema = buildLocalBusinessJsonLd({
    name: org.name,
    slug: org.slug,
    city: org.city,
    country: store?.country,
    address: store?.address ?? org.address,
    phone: store?.phone ?? org.phone,
    whatsappPhone: org.whatsapp_phone,
    email: store?.email ?? org.email,
    tagline: store?.tagline ?? org.tagline,
    coverUrl: store?.coverUrl ?? org.coverUrl,
    fallbackCover: store?.visual.coverImage,
    services: (store?.services ?? org.services).map((s) => ({
      name: s.name,
      price: s.price,
    })),
    publicBookingEnabled: true,
  });

  return (
    <>
      <JsonLd data={schema} />
      <MarketingBookingPage org={org} />
    </>
  );
}
