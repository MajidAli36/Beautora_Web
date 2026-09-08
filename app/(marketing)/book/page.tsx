import type { Metadata } from "next";
import { getPublicStoreBookingProfile } from "@/lib/actions/store-profile";
import { MarketingBookingPage } from "@/components/marketing/marketing-booking-page";
import { BOOKING_SLUG } from "@/lib/marketing/brand";
import { SYNCOPS } from "@/lib/print/syncops";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const org = await getPublicStoreBookingProfile(BOOKING_SLUG);
  return {
    title: org ? `Book at ${org.name}` : "Book Appointment",
    description: org
      ? `Schedule your visit at ${org.name}. Online booking powered by ${SYNCOPS.name} by ${SYNCOPS.builder.name}.`
      : `Online salon booking powered by ${SYNCOPS.name} by ${SYNCOPS.builder.name}.`,
  };
}

export default async function BookAppointmentPage() {
  const org = await getPublicStoreBookingProfile(BOOKING_SLUG);
  return <MarketingBookingPage org={org} />;
}
