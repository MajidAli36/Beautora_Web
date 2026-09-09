import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, Globe, Mail } from "lucide-react";
import { buildPageMetadata, absoluteUrl } from "@/lib/seo/site";
import { buildCeoPageJsonLd } from "@/lib/seo/studio";
import { CEO_PAGE } from "@/lib/marketing/ceo-page";
import { SYNCOPS } from "@/lib/print/syncops";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: `${CEO_PAGE.ceo.name} — Founder & CEO of SyncOps`,
    description: `${CEO_PAGE.ceo.message} Connect: ${SYNCOPS.ceo.links.website} · LinkedIn · GitHub. ${SYNCOPS.name} is a SyncOps product.`,
    path: "/ceo",
    keywords: [
      "Majid Ali",
      "Majid Ali SyncOps",
      "SyncOps CEO",
      "Beautora founder",
      "majidali.tech",
      "MajidAli36",
      "salon software founder Pakistan",
    ],
  }),
  authors: [
    { name: SYNCOPS.ceo.name, url: SYNCOPS.ceo.links.website },
    { name: SYNCOPS.builder.name, url: SYNCOPS.builder.url },
  ],
  openGraph: {
    type: "profile",
    locale: "en_PK",
    url: absoluteUrl("/ceo"),
    siteName: `${SYNCOPS.name} · ${SYNCOPS.builder.name}`,
    title: `${CEO_PAGE.ceo.name} — Founder & CEO of SyncOps`,
    description: CEO_PAGE.ceo.message,
    images: [
      {
        url: absoluteUrl(CEO_PAGE.ceo.photo),
        width: 640,
        height: 800,
        alt: CEO_PAGE.ceo.portraitAlt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${CEO_PAGE.ceo.name} — Founder & CEO of SyncOps`,
    description: CEO_PAGE.ceo.headline,
  },
};

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.57 2.34 1.12 2.91.86.09-.66.35-1.12.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.27 2.75 1.05A9.3 9.3 0 0 1 12 7.4c.85 0 1.71.12 2.51.35 1.9-1.32 2.74-1.05 2.74-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.48A10.04 10.04 0 0 0 22 12.26C22 6.58 17.52 2 12 2z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5h4V23h-4V8.5zM8.5 8.5h3.8v2h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V23h-4v-5.8c0-1.38-.03-3.16-1.93-3.16-1.93 0-2.23 1.5-2.23 3.06V23h-4V8.5z" />
    </svg>
  );
}

export default function CeoPage() {
  const { ceo } = CEO_PAGE;
  const links = ceo.links;
  const jsonLd = buildCeoPageJsonLd();

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
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_480px_at_85%_-10%,rgba(61,107,95,0.12),transparent_55%)]"
        />
        <div className="relative mx-auto grid max-w-6xl items-end gap-12 px-6 pb-20 pt-28 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-28 lg:pt-32">
          <div className="order-2 m-fade-up lg:order-1">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
              {ceo.messageTitle}
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              {ceo.name}
            </h1>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--m-accent)]">
              {ceo.role}
            </p>
            <p className="mt-3 text-base text-[var(--m-muted)]">
              {SYNCOPS.builder.name} · makers of{" "}
              <Link
                href="/"
                className="font-medium text-[var(--m-ink)] underline-offset-4 hover:underline"
              >
                {SYNCOPS.name}
              </Link>
            </p>

            <p className="mt-8 max-w-xl font-display text-xl leading-relaxed text-[var(--m-ink-soft)] sm:text-2xl">
              {ceo.headline}
            </p>
            <blockquote className="mt-6 max-w-xl border-l border-[var(--m-accent)]/40 pl-5 text-base leading-relaxed text-[var(--m-muted)] sm:text-lg">
              “{ceo.message}”
            </blockquote>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <CeoSocial href={links.linkedin} label="LinkedIn">
                <LinkedInIcon className="size-4" />
              </CeoSocial>
              <CeoSocial href={links.website} label="Website · majidali.tech">
                <Globe className="size-4" />
              </CeoSocial>
              <CeoSocial href={links.github} label="GitHub">
                <GitHubIcon className="size-4" />
              </CeoSocial>
              <CeoSocial href={`mailto:${links.email}`} label="Email">
                <Mail className="size-4" />
              </CeoSocial>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={links.website}
                target="_blank"
                rel="noopener noreferrer me"
                className="inline-flex h-12 items-center gap-2 bg-[var(--m-ink)] px-7 text-sm font-semibold tracking-wide text-[var(--m-paper)] transition-colors hover:bg-[var(--m-ink-soft)]"
              >
                majidali.tech
                <ArrowUpRight className="size-4" />
              </a>
              <a
                href={`mailto:${links.email}`}
                className="inline-flex h-12 items-center border border-[var(--m-ink)] px-7 text-sm font-medium tracking-wide text-[var(--m-ink)] transition-colors hover:bg-[var(--m-ink)] hover:text-[var(--m-paper)]"
              >
                {links.email}
              </a>
            </div>
          </div>

          <div className="order-1 m-fade-up m-fade-up-delay-1 lg:order-2">
            <div className="relative mx-auto w-full max-w-md lg:ml-auto lg:mr-0">
              <div
                aria-hidden
                className="absolute -inset-3 bg-[radial-gradient(circle_at_30%_20%,rgba(61,107,95,0.18),transparent_55%)]"
              />
              <div className="relative overflow-hidden border border-[var(--m-line)] bg-white shadow-[0_28px_60px_-28px_rgba(6,33,29,0.35)]">
                <Image
                  src={ceo.photo}
                  alt={ceo.portraitAlt}
                  width={720}
                  height={900}
                  priority
                  className="m-ken aspect-[4/5] w-full object-cover object-top"
                />
              </div>
              <p className="mt-4 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--m-muted)] lg:text-right">
                Founder · SyncOps · Beautora
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Focus */}
      <section className="border-b border-[var(--m-line)] bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
            Leadership focus
          </p>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-[var(--m-muted)] sm:text-xl">
            {ceo.focus}
          </p>

          <ul className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {ceo.principles.map((item) => (
              <li key={item.title} className="border-t border-[var(--m-line)] pt-5">
                <p className="font-display text-xl font-semibold text-[var(--m-ink)]">
                  {item.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--m-muted)]">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Links */}
      <section className="bg-[var(--m-mist)] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
            SyncOps & Beautora
          </p>
          <h2 className="mt-4 max-w-2xl font-display text-3xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-4xl">
            Building the studio behind the salon OS.
          </h2>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <BackLink
              href={CEO_PAGE.syncOpsUrl}
              external
              label="SyncOps website"
              hint={CEO_PAGE.syncOpsDomain}
            />
            <BackLink href={CEO_PAGE.syncOpsPath} label="Studio page" hint="/syncops" />
            <BackLink href="/" label={SYNCOPS.name} hint={SYNCOPS.domain} />
            <BackLink href={links.linkedin} external label="LinkedIn" hint="majidali-syncops" />
          </div>
        </div>
      </section>
    </div>
  );
}

function CeoSocial({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  const external = !href.startsWith("mailto:");
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer me" : undefined}
      aria-label={label}
      className="inline-flex size-11 items-center justify-center border border-[var(--m-line)] bg-white text-[var(--m-ink-soft)] transition-colors hover:border-[var(--m-ink)] hover:text-[var(--m-ink)]"
    >
      {children}
    </a>
  );
}

function BackLink({
  href,
  label,
  hint,
  external,
}: {
  href: string;
  label: string;
  hint: string;
  external?: boolean;
}) {
  const className =
    "group flex items-center justify-between gap-3 border border-[var(--m-line)] bg-white px-4 py-3.5 transition-colors hover:border-[var(--m-ink)]";
  const body = (
    <>
      <span>
        <span className="block text-sm font-semibold text-[var(--m-ink)]">{label}</span>
        <span className="mt-0.5 block text-xs text-[var(--m-muted)]">{hint}</span>
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-[var(--m-accent)] opacity-70 transition-opacity group-hover:opacity-100" />
    </>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer me author" className={className}>
        {body}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {body}
    </Link>
  );
}
