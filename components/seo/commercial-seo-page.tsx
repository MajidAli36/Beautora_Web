import Link from "next/link";
import type { CommercialPage } from "@/lib/seo/content/commercial";
import { BeautoraLogo } from "@/components/brand/beautora-logo";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { FaqSection } from "@/components/seo/faq-section";
import { LandingFinalCta } from "@/components/marketing/landing-final-cta";

export function CommercialSeoPage({ page }: { page: CommercialPage }) {
  return (
    <div className="bg-[var(--m-paper)] pt-[var(--m-chrome)]">
      <div className="border-b border-[var(--m-line)] bg-[var(--m-mist)]">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:py-16">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: page.navLabel, path: page.path },
            ]}
          />
          <div className="mt-8 flex items-center gap-2.5">
            <BeautoraLogo size="sm" />
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
              Beautora
            </p>
          </div>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-5xl lg:text-6xl">
            {page.h1}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--m-muted)]">{page.lead}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex h-11 items-center justify-center bg-[var(--m-ink)] px-5 text-sm font-semibold text-white"
            >
              Start free trial
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-11 items-center justify-center border border-[var(--m-line)] px-5 text-sm font-semibold text-[var(--m-ink)]"
            >
              View pricing
            </Link>
            <Link
              href="/features"
              className="inline-flex h-11 items-center justify-center border border-[var(--m-line)] px-5 text-sm font-semibold text-[var(--m-ink)]"
            >
              See features
            </Link>
          </div>
        </div>
      </div>

      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--m-ink)]">
              Problems we solve
            </h2>
            <ul className="mt-8 space-y-6">
              {page.problems.map((item) => (
                <li key={item.title}>
                  <h3 className="text-base font-semibold text-[var(--m-ink)]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--m-muted)]">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--m-ink)]">
              What you get
            </h2>
            <ul className="mt-8 space-y-6">
              {page.capabilities.map((item) => (
                <li key={item.title}>
                  <h3 className="text-base font-semibold text-[var(--m-ink)]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--m-muted)]">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--m-line)] bg-[var(--m-mist)] py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--m-ink)]">
            Who it&apos;s for
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {page.whoFor.map((item) => (
              <li
                key={item}
                className="border border-[var(--m-line)] bg-[var(--m-paper)] px-4 py-3 text-sm text-[var(--m-ink-soft)]"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {page.related.length ? (
        <section className="py-14">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--m-muted)]">
              Related
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {page.related.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="border border-[var(--m-line)] bg-white px-4 py-2 text-sm font-medium text-[var(--m-ink)] transition-colors hover:border-[var(--m-ink)]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <FaqSection path={page.path} faqs={page.faqs} />
      <LandingFinalCta />
    </div>
  );
}
