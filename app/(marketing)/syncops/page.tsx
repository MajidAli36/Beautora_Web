import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { buildPageMetadata } from "@/lib/seo/site";
import { buildSyncOpsPageJsonLd } from "@/lib/seo/studio";
import { SYNCOPS_PAGE } from "@/lib/marketing/syncops-page";
import { SYNCOPS } from "@/lib/print/syncops";

export const metadata: Metadata = buildPageMetadata({
  title: `${SYNCOPS.builder.name} — Product studio behind Beautora`,
  description: `${SYNCOPS_PAGE.lead} Official studio: ${SYNCOPS.builder.domain}. Founded by ${SYNCOPS.ceo.name}.`,
  path: "/syncops",
  keywords: [
    "SyncOps",
    "SyncOps tech",
    "syncops.tech",
    "SyncOps Beautora",
    "software studio Pakistan",
    "salon software company",
    "Majid Ali SyncOps",
    "Beautora by SyncOps",
  ],
});

export default function SyncOpsStudioPage() {
  const jsonLd = buildSyncOpsPageJsonLd();

  return (
    <div className="bg-[var(--m-paper)] text-[var(--m-ink)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--m-line)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_480px_at_12%_-10%,rgba(61,107,95,0.12),transparent_55%)]"
        />
        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-28 lg:pb-28 lg:pt-32">
          <p className="m-fade-up text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
            {SYNCOPS_PAGE.eyebrow}
          </p>
          <h1 className="m-fade-up m-fade-up-delay-1 mt-4 max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            {SYNCOPS_PAGE.headline}
          </h1>
          <p className="m-fade-up m-fade-up-delay-2 mt-6 max-w-2xl text-base leading-relaxed text-[var(--m-muted)] sm:text-lg">
            {SYNCOPS_PAGE.lead}
          </p>

          <div className="m-fade-up m-fade-up-delay-3 mt-10 flex flex-wrap gap-3">
            <a
              href={SYNCOPS_PAGE.url}
              target="_blank"
              rel="noopener noreferrer me author"
              className="inline-flex h-12 items-center gap-2 bg-[var(--m-ink)] px-7 text-sm font-semibold tracking-wide text-[var(--m-paper)] transition-colors hover:bg-[var(--m-ink-soft)]"
            >
              Visit {SYNCOPS_PAGE.domain}
              <ArrowUpRight className="size-4" />
            </a>
            <Link
              href={SYNCOPS_PAGE.ceoPath}
              className="inline-flex h-12 items-center border border-[var(--m-ink)] px-7 text-sm font-medium tracking-wide text-[var(--m-ink)] transition-colors hover:bg-[var(--m-ink)] hover:text-[var(--m-paper)]"
            >
              Meet the CEO
            </Link>
            <Link
              href="/"
              className="inline-flex h-12 items-center border border-[var(--m-line)] px-7 text-sm font-medium tracking-wide text-[var(--m-ink-soft)] transition-colors hover:border-[var(--m-ink)] hover:text-[var(--m-ink)]"
            >
              Explore {SYNCOPS_PAGE.product}
            </Link>
          </div>
        </div>
      </section>

      {/* Points */}
      <section className="border-b border-[var(--m-line)] bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
            What we ship
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-4xl">
            Products and principles for operators.
          </h2>

          <ul className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {SYNCOPS_PAGE.points.map((point) => (
              <li key={point.title} className="border-t border-[var(--m-line)] pt-5">
                {"href" in point && point.href ? (
                  <Link
                    href={point.href}
                    className="font-display text-2xl font-medium text-[var(--m-ink)] transition-colors hover:text-[var(--m-accent)]"
                  >
                    {point.title}
                  </Link>
                ) : (
                  <p className="font-display text-2xl font-medium text-[var(--m-ink)]">
                    {point.title}
                  </p>
                )}
                <p className="mt-3 text-base leading-relaxed text-[var(--m-muted)]">{point.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Official links */}
      <section className="bg-[var(--m-mist)] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
            Official SyncOps links
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-4xl">
            Find the studio, the product, and the founder.
          </h2>

          <ul className="mt-10 grid gap-3 sm:grid-cols-2">
            {SYNCOPS_PAGE.backlinks.map((link) => {
              const className =
                "group flex items-center justify-between gap-3 border border-[var(--m-line)] bg-white px-4 py-3.5 transition-colors hover:border-[var(--m-ink)]";
              const inner = (
                <>
                  <span>
                    <span className="block text-sm font-semibold text-[var(--m-ink)]">
                      {link.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--m-muted)]">{link.hint}</span>
                  </span>
                  <ArrowUpRight className="size-4 shrink-0 text-[var(--m-accent)] opacity-70 transition-opacity group-hover:opacity-100" />
                </>
              );
              return (
                <li key={link.label}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer me author"
                      className={className}
                    >
                      {inner}
                    </a>
                  ) : (
                    <Link href={link.href} className={className}>
                      {inner}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>

          <p className="mt-10 text-sm text-[var(--m-muted)]">
            © {new Date().getFullYear()} {SYNCOPS_PAGE.company} · {SYNCOPS_PAGE.productCredit} ·{" "}
            <a
              href={`tel:${SYNCOPS_PAGE.phone.replace(/\s/g, "")}`}
              className="font-medium text-[var(--m-ink)] underline-offset-4 hover:underline"
            >
              {SYNCOPS_PAGE.phoneDisplay}
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
