import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/site";
import { CEO_PAGE } from "@/lib/marketing/ceo-page";
import { SYNCOPS } from "@/lib/print/syncops";

export const metadata: Metadata = buildPageMetadata({
  title: `${CEO_PAGE.ceo.name} — Founder & CEO of SyncOps`,
  description: `${CEO_PAGE.ceo.message} ${SYNCOPS.name} is a SyncOps product.`,
  path: "/ceo",
  keywords: [
    "Majid Ali",
    "Majid Ali SyncOps",
    "SyncOps CEO",
    "Beautora founder",
  ],
});

export default function CeoPage() {
  const { ceo } = CEO_PAGE;

  return (
    <div className="relative flex min-h-[100svh] flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <Link
            href={CEO_PAGE.syncOpsPath}
            className="font-display text-xl font-semibold tracking-tight text-[var(--s-mist)] transition-colors hover:text-[var(--s-accent)]"
          >
            SyncOps
          </Link>
          <span className="text-[var(--s-accent-deep)]" aria-hidden>
            |
          </span>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--s-accent)]">
            CEO
          </p>
        </div>
        <Link
          href="/"
          className="text-sm text-[var(--s-muted)] transition-colors hover:text-[var(--s-accent)]"
        >
          ← Salon home
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center px-6 py-10 sm:py-16">
        <div className="grid w-full items-center gap-10 md:grid-cols-[0.85fr_1.15fr] md:gap-14">
          <div className="relative mx-auto w-full max-w-sm md:mx-0">
            <div className="overflow-hidden rounded-2xl border border-[var(--s-line)] bg-[var(--s-panel)]">
              <Image
                src={ceo.photo}
                alt={ceo.portraitAlt}
                width={640}
                height={800}
                priority
                className="aspect-[4/5] w-full object-cover object-top"
              />
            </div>
          </div>

          <div>
            <p className="s-fade-up text-xs font-semibold uppercase tracking-[0.28em] text-[var(--s-accent)]">
              {ceo.messageTitle}
            </p>
            <h1 className="s-fade-up s-fade-up-delay-1 mt-4 font-display text-3xl font-semibold tracking-tight text-[var(--s-mist)] sm:text-4xl">
              {ceo.name}
            </h1>
            <p className="s-fade-up s-fade-up-delay-1 mt-2 text-sm text-[var(--s-accent)]">
              {ceo.role} · {SYNCOPS.builder.name}
            </p>
            <p className="s-fade-up s-fade-up-delay-2 mt-8 max-w-lg text-base leading-relaxed text-[var(--s-muted)] sm:text-lg">
              {ceo.message}
            </p>
            <div className="s-fade-up s-fade-up-delay-3 mt-10 flex flex-wrap gap-3">
              <Link
                href={CEO_PAGE.syncOpsPath}
                className="inline-flex h-11 items-center bg-[var(--s-accent)] px-6 text-sm font-semibold text-[var(--s-ink)] transition-colors hover:bg-[var(--s-mist)]"
              >
                About SyncOps
              </Link>
              <a
                href={`mailto:${CEO_PAGE.email}`}
                className="inline-flex h-11 items-center border border-[var(--s-line)] px-6 text-sm text-[var(--s-mist)] transition-colors hover:border-[var(--s-accent)]"
              >
                {CEO_PAGE.email}
              </a>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-[var(--s-line)]">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-6 text-xs text-[var(--s-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {CEO_PAGE.company} · {CEO_PAGE.productCredit}
          </p>
          <a
            href={`tel:${CEO_PAGE.phone.replace(/\s/g, "")}`}
            className="hover:text-[var(--s-accent)]"
          >
            {CEO_PAGE.phoneDisplay}
          </a>
        </div>
      </footer>
    </div>
  );
}
