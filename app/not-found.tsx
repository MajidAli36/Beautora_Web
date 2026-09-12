import Link from "next/link";
import { BeautoraWordmark } from "@/components/brand/beautora-logo";
import { SYNCOPS } from "@/lib/print/syncops";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-[var(--m-paper)] px-6 py-24 text-center text-[var(--m-ink)]">
      <BeautoraWordmark size="lg" textClassName="text-[var(--m-ink)]" />
      <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--m-accent)]">
        404
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        Page not found
      </h1>
      <p className="mt-4 max-w-md text-base text-[var(--m-muted)]">
        That link doesn&apos;t exist on {SYNCOPS.name}. Try one of these instead.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center bg-[var(--m-ink)] px-5 text-sm font-semibold text-[var(--m-paper)]"
        >
          Home
        </Link>
        <Link
          href="/salon-management-software"
          className="inline-flex h-11 items-center justify-center border border-[var(--m-line)] px-5 text-sm font-medium text-[var(--m-ink)]"
        >
          Product
        </Link>
        <Link
          href="/stores"
          className="inline-flex h-11 items-center justify-center border border-[var(--m-line)] px-5 text-sm font-medium text-[var(--m-ink)]"
        >
          Stores
        </Link>
        <Link
          href="/blog"
          className="inline-flex h-11 items-center justify-center border border-[var(--m-line)] px-5 text-sm font-medium text-[var(--m-ink)]"
        >
          Blog
        </Link>
      </div>
    </div>
  );
}

