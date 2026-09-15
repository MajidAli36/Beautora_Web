import Link from "next/link";
import { Breadcrumbs, type Crumb } from "@/components/seo/breadcrumbs";

type MarketingDocProps = {
  eyebrow: string;
  title: string;
  lead: string;
  children: React.ReactNode;
  breadcrumbs?: Crumb[];
};

/** Shared chrome for About / Contact / Privacy / Terms — matches marketing design. */
export function MarketingDoc({
  eyebrow,
  title,
  lead,
  children,
  breadcrumbs,
}: MarketingDocProps) {
  return (
    <div className="bg-[var(--m-paper)] text-[var(--m-ink)]">
      <div className="border-b border-[var(--m-line)] bg-[var(--m-mist)] pt-[var(--m-chrome)]">
        <div className="mx-auto max-w-3xl px-6 py-14 sm:py-16">
          {breadcrumbs?.length ? (
            <div className="mb-6">
              <Breadcrumbs items={breadcrumbs} />
            </div>
          ) : null}
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--m-accent)]">
            {eyebrow}
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[var(--m-muted)] sm:text-lg">{lead}</p>
        </div>
      </div>
      <article className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <div className="space-y-8 text-[15px] leading-relaxed text-[var(--m-ink-soft)] [&_a]:font-medium [&_a]:text-[var(--m-accent)] [&_a]:underline-offset-4 hover:[&_a]:underline [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-[var(--m-ink)] [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-[var(--m-ink)] [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          {children}
        </div>
        <p className="mt-12 text-sm text-[var(--m-muted)]">
          <Link href="/">← Back to Beautora</Link>
        </p>
      </article>
    </div>
  );
}
