import type { Metadata } from "next";
import { cache } from "react";
import { getPublicStoreBookingProfile } from "@/lib/actions/store-profile";
import { getPublicStoreBySlug } from "@/lib/actions/stores";
import { MarketingBookingPage } from "@/components/marketing/marketing-booking-page";
import { JsonLd } from "@/components/seo/json-ld";
import { BOOKING_SLUG } from "@/lib/marketing/brand";
import { buildLocalBusinessJsonLd } from "@/lib/seo/local-business";
import { buildPageMetadata } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";

export const revalidate = 120;

const loadBookPageData = cache(async () => {
  const [org, store] = await Promise.all([
    getPublicStoreBookingProfile(BOOKING_SLUG),
    getPublicStoreBySlug(BOOKING_SLUG),
  ]);
  return { org, store };
});

export async function generateMetadata(): Promise<Metadata> {
  const { org, store } = await loadBookPageData();
  if (!org) {
    return buildPageMetadata({
      title: "Book Appointment",
      description: `Online salon booking powered by ${SYNCOPS.name} — Salon Management, POS & Marketplace by ${SYNCOPS.builder.name}.`,
      path: "/book",
    });
  }
  const cityBit = org.city?.trim() ? ` in ${org.city.trim()}` : "";
  return buildPageMetadata({
    title: `Book at ${org.name}`,
    description: `Schedule your visit at ${org.name}${cityBit}. Online booking powered by ${SYNCOPS.name}.`,
    path: "/book",
    image: store?.coverUrl ?? store?.visual.coverImage ?? org.coverUrl,
  });
}

export default async function BookAppointmentPage() {
  const { org, store } = await loadBookPageData();

  const schema =
    org != null
      ? buildLocalBusinessJsonLd({
          name: org.name,
          slug: org.slug,
          city: org.city,
          country: store?.country ?? org.country,
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
        })
      : null;

  return (
    <>
      {schema ? <JsonLd data={schema} /> : null}
      <MarketingBookingPage org={org} />
    </>
  );
}
