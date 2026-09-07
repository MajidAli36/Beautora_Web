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
    <div className="relative flex min-h-[100svh] flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <p className="font-display text-xl font-semibold tracking-tight text-[var(--s-mist)]">
            SyncOps
          </p>
          <span className="text-[var(--s-accent-deep)]" aria-hidden>
            |
          </span>
          <Link
            href={SYNCOPS_PAGE.ceoPath}
            className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--s-accent)] transition-colors hover:text-[var(--s-mist)]"
          >
            CEO
          </Link>
        </div>
        <div className="flex items-center gap-4 text-sm text-[var(--s-muted)]">
          <a
            href={SYNCOPS_PAGE.url}
            target="_blank"
            rel="noopener noreferrer me author"
            className="hidden transition-colors hover:text-[var(--s-accent)] sm:inline"
          >
            {SYNCOPS_PAGE.domain}
          </a>
          <Link href="/" className="transition-colors hover:text-[var(--s-accent)]">
            ← Salon home
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-10 sm:py-16">
        <p className="s-fade-up text-xs font-semibold uppercase tracking-[0.28em] text-[var(--s-accent)]">
          {SYNCOPS_PAGE.eyebrow}
        </p>
        <h1 className="s-fade-up s-fade-up-delay-1 mt-4 max-w-3xl font-display text-3xl font-semibold tracking-tight text-[var(--s-mist)] sm:text-5xl">
          {SYNCOPS_PAGE.headline}
        </h1>
        <p className="s-fade-up s-fade-up-delay-2 mt-6 max-w-2xl text-base leading-relaxed text-[var(--s-muted)] sm:text-lg">
          {SYNCOPS_PAGE.lead}
        </p>

        <ul className="s-fade-up s-fade-up-delay-3 mt-12 grid gap-6 sm:grid-cols-3">
          {SYNCOPS_PAGE.points.map((point) => (
            <li
              key={point.title}
              className="rounded-2xl border border-[var(--s-line)] bg-[var(--s-panel)] p-5"
            >
              {"href" in point && point.href ? (
                <Link
                  href={point.href}
                  className="font-display text-lg font-semibold text-[var(--s-mist)] transition-colors hover:text-[var(--s-accent)]"
                >
                  {point.title}
                </Link>
              ) : (
                <p className="font-display text-lg font-semibold text-[var(--s-mist)]">
                  {point.title}
                </p>
              )}
              <p className="mt-2 text-sm leading-relaxed text-[var(--s-muted)]">{point.body}</p>
            </li>
          ))}
        </ul>

        <section className="s-fade-up s-fade-up-delay-3 mt-14 border-t border-[var(--s-line)] pt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--s-accent)]">
            Official SyncOps links
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {SYNCOPS_PAGE.backlinks.map((link) => {
              const className =
                "group flex items-center justify-between gap-3 border border-[var(--s-line)] bg-[var(--s-panel)]/60 px-4 py-3 transition-colors hover:border-[var(--s-accent)]";
              const inner = (
                <>
                  <span>
                    <span className="block text-sm font-semibold text-[var(--s-mist)]">
                      {link.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--s-muted)]">{link.hint}</span>
                  </span>
                  <ArrowUpRight className="size-4 shrink-0 text-[var(--s-accent)] opacity-70 transition-opacity group-hover:opacity-100" />
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
        </section>

        <div className="s-fade-up s-fade-up-delay-3 mt-12 flex flex-wrap gap-3">
          <a
            href={SYNCOPS_PAGE.url}
            target="_blank"
            rel="noopener noreferrer me author"
            className="inline-flex h-11 items-center bg-[var(--s-accent)] px-6 text-sm font-semibold text-[var(--s-ink)] transition-colors hover:bg-[var(--s-mist)]"
          >
            Visit {SYNCOPS_PAGE.domain}
          </a>
          <Link
            href={SYNCOPS_PAGE.ceoPath}
            className="inline-flex h-11 items-center border border-[var(--s-line)] px-6 text-sm text-[var(--s-mist)] transition-colors hover:border-[var(--s-accent)]"
          >
            Meet the CEO
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center border border-[var(--s-line)] px-6 text-sm text-[var(--s-mist)] transition-colors hover:border-[var(--s-accent)]"
          >
            Explore {SYNCOPS_PAGE.product}
          </Link>
        </div>
      </main>

      <footer className="border-t border-[var(--s-line)]">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-6 text-xs text-[var(--s-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SYNCOPS_PAGE.company} · {SYNCOPS_PAGE.productCredit}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <a
              href={SYNCOPS_PAGE.url}
              target="_blank"
              rel="noopener noreferrer me author"
              className="hover:text-[var(--s-accent)]"
            >
              {SYNCOPS_PAGE.domain}
            </a>
            <Link href="/ceo" className="hover:text-[var(--s-accent)]">
              {SYNCOPS.ceo.name}
            </Link>
            <a
              href={`tel:${SYNCOPS_PAGE.phone.replace(/\s/g, "")}`}
              className="hover:text-[var(--s-accent)]"
            >
              {SYNCOPS_PAGE.phoneDisplay}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
