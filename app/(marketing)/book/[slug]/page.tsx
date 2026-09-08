import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicStoreBookingProfile } from "@/lib/actions/store-profile";
import { MarketingBookingPage } from "@/components/marketing/marketing-booking-page";
import { SYNCOPS } from "@/lib/print/syncops";

export const dynamic = "force-dynamic";

type BookPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: BookPageProps): Promise<Metadata> {
  const { slug } = await params;
  const org = await getPublicStoreBookingProfile(slug);
  return {
    title: org ? `Book at ${org.name}` : "Book appointment",
    description: org
      ? `Book online at ${org.name}. Powered by ${SYNCOPS.name} by ${SYNCOPS.builder.name}.`
      : `Online salon booking by ${SYNCOPS.name} by ${SYNCOPS.builder.name}.`,
  };
}

export default async function BookSlugPage({ params }: BookPageProps) {
  const { slug } = await params;
  const org = await getPublicStoreBookingProfile(slug);
  if (!org) notFound();

  return <MarketingBookingPage org={org} />;
}
