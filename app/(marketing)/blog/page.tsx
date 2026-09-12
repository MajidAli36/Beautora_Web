import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { BLOG_POSTS } from "@/lib/seo/content/blog";
import { buildPageMetadata } from "@/lib/seo/site";

export const revalidate = 3600;

export const metadata: Metadata = buildPageMetadata({
  title: "Blog — Salon Operations Insights",
  description:
    "Practical articles for salon and beauty-business owners: booking, POS, no-shows, staffing, and operations — from Beautora.",
  path: "/blog",
  keywords: ["salon blog", "salon operations tips", "beauty business management"],
});

export default function BlogIndexPage() {
  return (
    <div className="bg-[var(--m-paper)] pt-[var(--m-chrome)]">
      <div className="border-b border-[var(--m-line)] bg-[var(--m-mist)]">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }]} />
          <h1 className="mt-8 font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-5xl">
            Salon operations blog
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--m-muted)]">
            Short, useful articles for owners and managers — not keyword spam.
          </p>
        </div>
      </div>
      <section className="py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 sm:grid-cols-2">
          {BLOG_POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="border border-[var(--m-line)] bg-white p-6 transition-colors hover:border-[var(--m-ink)]"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--m-muted)]">
                {post.publishedAt}
              </p>
              <h2 className="mt-3 font-display text-2xl font-semibold text-[var(--m-ink)]">
                {post.title}
              </h2>
              <p className="mt-2 text-sm text-[var(--m-muted)]">{post.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
