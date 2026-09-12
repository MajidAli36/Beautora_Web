import type { Metadata } from "next";
import { CommercialSeoPage } from "@/components/seo/commercial-seo-page";
import { getCommercialPage } from "@/lib/seo/content/commercial";
import { buildPageMetadata } from "@/lib/seo/site";
import { notFound } from "next/navigation";

export const revalidate = 3600;

const page = getCommercialPage("salon-management-software");

export const metadata: Metadata = page
  ? buildPageMetadata({
      title: page.title,
      description: page.description,
      path: page.path,
      keywords: page.keywords,
    })
  : {};

export default function SalonManagementSoftwarePage() {
  if (!page) notFound();
  return <CommercialSeoPage page={page} />;
}
