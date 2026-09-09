import type { Metadata } from "next";
import { getPublicStoreBookingProfile } from "@/lib/actions/store-profile";
import { MarketingBookingPage } from "@/components/marketing/marketing-booking-page";
import { BOOKING_SLUG } from "@/lib/marketing/brand";
import { buildPageMetadata } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const org = await getPublicStoreBookingProfile(BOOKING_SLUG);
  if (!org) {
    return buildPageMetadata({
      title: "Book Appointment",
      description: `Online salon booking powered by ${SYNCOPS.name}, the salon operating system by ${SYNCOPS.builder.name}.`,
      path: "/book",
    });
  }
  return buildPageMetadata({
    title: `Book at ${org.name}`,
    description: `Schedule your visit at ${org.name}. Online booking powered by ${SYNCOPS.name}.`,
    path: "/book",
  });
}

export default async function BookAppointmentPage() {
  const org = await getPublicStoreBookingProfile(BOOKING_SLUG);
  return <MarketingBookingPage org={org} />;
}
