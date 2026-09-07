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
    <div className="relative flex min-h-[100svh] flex-col overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div
        aria-hidden
        className="s-glow pointer-events-none absolute -left-24 top-24 size-[28rem] rounded-full bg-[radial-gradient(circle,rgba(212,180,131,0.18),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-10 size-[22rem] rounded-full bg-[radial-gradient(circle,rgba(80,120,140,0.16),transparent_70%)]"
      />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
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
        <div className="flex items-center gap-4 text-sm text-[var(--s-muted)]">
          <a
            href={CEO_PAGE.syncOpsUrl}
            target="_blank"
            rel="noopener noreferrer me author"
            className="hidden transition-colors hover:text-[var(--s-accent)] sm:inline"
          >
            {CEO_PAGE.syncOpsDomain}
          </a>
          <Link href="/" className="transition-colors hover:text-[var(--s-accent)]">
            ← Salon home
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-6 pb-16 pt-4 sm:pt-8">
        {/* Hero — one composition: name + portrait + message */}
        <section className="grid items-end gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="order-2 lg:order-1">
            <p className="s-fade-up text-xs font-semibold uppercase tracking-[0.28em] text-[var(--s-accent)]">
              {ceo.messageTitle}
            </p>
            <h1 className="s-fade-up s-fade-up-delay-1 mt-5 font-display text-[2.75rem] font-semibold leading-[1.05] tracking-tight text-[var(--s-mist)] sm:text-6xl lg:text-7xl">
              {ceo.name}
            </h1>
            <p className="s-fade-up s-fade-up-delay-1 mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--s-accent)]">
              {ceo.role}
            </p>
            <p className="s-fade-up s-fade-up-delay-2 mt-3 text-base text-[var(--s-muted)]">
              {SYNCOPS.builder.name} · makers of{" "}
              <Link href="/" className="text-[var(--s-mist)] underline-offset-4 hover:underline">
                {SYNCOPS.name}
              </Link>
            </p>

            <p className="s-fade-up s-fade-up-delay-2 mt-8 max-w-xl font-display text-xl leading-relaxed text-[var(--s-mist)]/90 sm:text-2xl">
              {ceo.headline}
            </p>
            <p className="s-fade-up s-fade-up-delay-3 mt-5 max-w-xl text-base leading-relaxed text-[var(--s-muted)] sm:text-lg">
              {ceo.message}
            </p>

            <div className="s-fade-up s-fade-up-delay-3 mt-9 flex flex-wrap items-center gap-3">
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

            <div className="s-fade-up s-fade-up-delay-3 mt-8 flex flex-wrap gap-3">
              <a
                href={links.website}
                target="_blank"
                rel="noopener noreferrer me"
                className="inline-flex h-11 items-center gap-2 bg-[var(--s-accent)] px-6 text-sm font-semibold text-[var(--s-ink)] transition-colors hover:bg-[var(--s-mist)]"
              >
                majidali.tech
                <ArrowUpRight className="size-4" />
              </a>
              <a
                href={`mailto:${links.email}`}
                className="inline-flex h-11 items-center border border-[var(--s-line)] px-6 text-sm text-[var(--s-mist)] transition-colors hover:border-[var(--s-accent)]"
              >
                {links.email}
              </a>
            </div>
          </div>

          <div className="order-1 s-fade-up lg:order-2">
            <div className="relative mx-auto w-full max-w-md lg:ml-auto lg:mr-0">
              <div
                aria-hidden
                className="absolute -inset-3 rounded-[1.75rem] bg-[linear-gradient(145deg,rgba(212,180,131,0.35),transparent_55%)] opacity-70 blur-sm"
              />
              <div className="relative overflow-hidden rounded-[1.35rem] border border-[var(--s-line)] bg-[var(--s-panel)] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)]">
                <Image
                  src={ceo.photo}
                  alt={ceo.portraitAlt}
                  width={720}
                  height={900}
                  priority
                  className="s-ken aspect-[4/5] w-full object-cover object-top"
                />
              </div>
              <p className="mt-4 text-center text-xs tracking-[0.2em] text-[var(--s-muted)] uppercase lg:text-right">
                Founder · SyncOps · Beautora
              </p>
            </div>
          </div>
        </section>

        {/* Focus */}
        <section className="mt-20 border-t border-[var(--s-line)] pt-12 sm:mt-28">
          <p className="s-fade-up text-xs font-semibold uppercase tracking-[0.28em] text-[var(--s-accent)]">
            Leadership focus
          </p>
          <p className="s-fade-up s-fade-up-delay-1 mt-5 max-w-3xl text-lg leading-relaxed text-[var(--s-mist)]/85 sm:text-xl">
            {ceo.focus}
          </p>

          <ul className="mt-10 grid gap-8 sm:grid-cols-3">
            {ceo.principles.map((item, i) => (
              <li
                key={item.title}
                className={`s-fade-up border-l border-[var(--s-accent)]/40 pl-5 ${
                  i === 1 ? "s-fade-up-delay-1" : i === 2 ? "s-fade-up-delay-2" : ""
                }`}
              >
                <p className="font-display text-lg font-semibold text-[var(--s-mist)]">
                  {item.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--s-muted)]">{item.body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* SyncOps backlinks */}
        <section className="mt-20 border-t border-[var(--s-line)] pt-12 sm:mt-24">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--s-accent)]">
            SyncOps & Beautora
          </p>
          <h2 className="mt-4 max-w-2xl font-display text-2xl font-semibold tracking-tight text-[var(--s-mist)] sm:text-3xl">
            Building the studio behind the salon OS.
          </h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <BackLink href={CEO_PAGE.syncOpsUrl} external label="SyncOps website" hint={CEO_PAGE.syncOpsDomain} />
            <BackLink href={CEO_PAGE.syncOpsPath} label="Studio page" hint="/syncops" />
            <BackLink href="/" label={SYNCOPS.name} hint={SYNCOPS.domain} />
            <BackLink href={links.linkedin} external label="LinkedIn" hint="majidali-syncops" />
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-[var(--s-line)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-6 text-xs text-[var(--s-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SYNCOPS.builder.name} · {CEO_PAGE.productCredit}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <a
              href={links.linkedin}
              target="_blank"
              rel="noopener noreferrer me"
              className="hover:text-[var(--s-accent)]"
            >
              LinkedIn
            </a>
            <a
              href={links.github}
              target="_blank"
              rel="noopener noreferrer me"
              className="hover:text-[var(--s-accent)]"
            >
              GitHub
            </a>
            <a
              href={links.website}
              target="_blank"
              rel="noopener noreferrer me"
              className="hover:text-[var(--s-accent)]"
            >
              majidali.tech
            </a>
            <a
              href={CEO_PAGE.syncOpsUrl}
              target="_blank"
              rel="noopener noreferrer me author"
              className="hover:text-[var(--s-accent)]"
            >
              {CEO_PAGE.syncOpsDomain}
            </a>
            <a
              href={`tel:${CEO_PAGE.phone.replace(/\s/g, "")}`}
              className="hover:text-[var(--s-accent)]"
            >
              {CEO_PAGE.phoneDisplay}
            </a>
          </div>
        </div>
      </footer>
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
      className="inline-flex size-11 items-center justify-center rounded-full border border-[var(--s-line)] bg-[var(--s-panel)] text-[var(--s-mist)] transition-all hover:border-[var(--s-accent)] hover:text-[var(--s-accent)] hover:shadow-[0_0_0_4px_rgba(212,180,131,0.12)]"
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
    "group flex items-center justify-between gap-3 border border-[var(--s-line)] bg-[var(--s-panel)]/50 px-4 py-3.5 transition-colors hover:border-[var(--s-accent)]";
  const body = (
    <>
      <span>
        <span className="block text-sm font-semibold text-[var(--s-mist)]">{label}</span>
        <span className="mt-0.5 block text-xs text-[var(--s-muted)]">{hint}</span>
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-[var(--s-accent)] opacity-60 transition-opacity group-hover:opacity-100" />
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
