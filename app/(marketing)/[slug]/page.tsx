import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommercialSeoPage } from "@/components/seo/commercial-seo-page";
import { getAllSeoPillarSlugs, getSeoPillarPage } from "@/lib/seo/content/registry";
import { buildPageMetadata } from "@/lib/seo/site";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllSeoPillarSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getSeoPillarPage(slug);
  if (!page) return {};
  return buildPageMetadata({
    title: page.title,
    description: page.description,
    path: page.path,
    keywords: page.keywords,
  });
}

export const revalidate = 3600;

export default async function SeoPillarSlugPage({ params }: Props) {
  const { slug } = await params;
  const page = getSeoPillarPage(slug);
  if (!page) notFound();
  return <CommercialSeoPage page={page} />;
}
