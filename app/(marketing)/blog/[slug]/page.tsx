import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { getAllBlogSlugs, getBlogPost } from "@/lib/seo/content/blog";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { robots: { index: false, follow: false } };
  return buildPageMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    keywords: post.tags,
  });
}

export const revalidate = 3600;

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": "Organization", name: post.author },
    publisher: {
      "@type": "Organization",
      name: SYNCOPS.name,
      url: absoluteUrl("/"),
    },
    mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
  };

  return (
    <article className="bg-[var(--m-paper)] pt-[var(--m-chrome)]">
      <JsonLd data={articleLd} />
      <div className="border-b border-[var(--m-line)] bg-[var(--m-mist)]">
        <div className="mx-auto max-w-3xl px-6 py-14">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "Blog", path: "/blog" },
              { name: post.title, path: `/blog/${post.slug}` },
            ]}
          />
          <p className="mt-8 text-xs uppercase tracking-[0.18em] text-[var(--m-muted)]">
            {post.publishedAt} · Updated {post.updatedAt} · {post.author}
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-5xl">
            {post.title}
          </h1>
          <p className="mt-4 text-lg text-[var(--m-muted)]">{post.description}</p>
        </div>
      </div>
      <div className="mx-auto max-w-3xl space-y-5 px-6 py-14 text-base leading-relaxed text-[var(--m-ink-soft)]">
        {post.body.map((paragraph) => (
          <p key={paragraph.slice(0, 24)}>{paragraph}</p>
        ))}
        <div className="border-t border-[var(--m-line)] pt-8">
          <p className="text-sm font-semibold text-[var(--m-ink)]">Continue reading</p>
          <ul className="mt-3 space-y-2 text-sm">
            {post.related.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="underline-offset-4 hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}
