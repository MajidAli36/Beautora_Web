import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/site";
import { SYNCOPS_PAGE } from "@/lib/marketing/syncops-page";
import { SYNCOPS } from "@/lib/print/syncops";

export const metadata: Metadata = buildPageMetadata({
  title: `${SYNCOPS.builder.name} — Product studio behind Beautora`,
  description: `${SYNCOPS_PAGE.lead} Visit ${SYNCOPS.builder.domain}. Beautora is a SyncOps product for salon POS, booking, and operations.`,
  path: "/syncops",
  keywords: [
    "SyncOps",
    "SyncOps tech",
    "SyncOps Beautora",
    "software studio Pakistan",
    "salon software company",
  ],
});

export default function SyncOpsStudioPage() {
  return (
    <div className="relative flex min-h-[100svh] flex-col">
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
        <Link
          href="/"
          className="text-sm text-[var(--s-muted)] transition-colors hover:text-[var(--s-accent)]"
        >
          ← Salon home
        </Link>
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
              <p className="font-display text-lg font-semibold text-[var(--s-mist)]">
                {point.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--s-muted)]">{point.body}</p>
            </li>
          ))}
        </ul>

        <div className="s-fade-up s-fade-up-delay-3 mt-12 flex flex-wrap gap-3">
          <a
            href={SYNCOPS_PAGE.url}
            target="_blank"
            rel="noopener noreferrer me author"
            className="inline-flex h-11 items-center bg-[var(--s-accent)] px-6 text-sm font-semibold text-[var(--s-ink)] transition-colors hover:bg-[var(--s-mist)]"
          >
            {SYNCOPS_PAGE.domain}
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
          <a
            href={`tel:${SYNCOPS_PAGE.phone.replace(/\s/g, "")}`}
            className="hover:text-[var(--s-accent)]"
          >
            {SYNCOPS_PAGE.phoneDisplay}
          </a>
        </div>
      </footer>
    </div>
  );
}
